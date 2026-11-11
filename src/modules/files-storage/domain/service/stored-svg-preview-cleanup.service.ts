import { Logger } from '@infra/logger';
import { type GetFile, S3ClientAdapter } from '@infra/s3-client';
import { EntityManager } from '@mikro-orm/mongodb';
import {
	Inject,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	type OnApplicationBootstrap,
} from '@nestjs/common';
import { TypeGuard } from '@shared/guard';
import { type EntityId } from '@shared/domain/types';
import {
	FILE_STORAGE_CONFIG_TOKEN,
	FILES_STORAGE_S3_CONNECTION,
	type FileStorageConfig,
} from '../../files-storage.config';
import { FILE_RECORD_REPO, type FileRecordRepo } from '../contract';
import { FilePathFactory } from '../factory';
import { type FileRecord } from '../file-record.do';
import { StoredSvgPreviewCleanupLoggable } from '../loggable';
import { SVG_XML_SNIFF_BYTE_COUNT, isSvgOrXmlContent, readStreamPrefix } from '../utils';
import { FilesStorageService } from './files-storage.service';
import { PreviewService } from './preview.service';

export const STORED_SVG_PREVIEW_CLEANUP_COLLECTION = 'filestoragemaintenance';
export const STORED_SVG_PREVIEW_CLEANUP_TASK_ID = 'svsdev-470-stored-svg-xml-preview-cleanup';

const CLEANUP_PAGE_SIZE = 50;
const STALE_TASK_AFTER_MS = 60 * 60 * 1000;
const SNIFF_RANGE = `bytes=0-${SVG_XML_SNIFF_BYTE_COUNT - 1}`;

interface CleanupTaskCollection {
	insertOne(document: { _id: string; status: 'running'; startedAt: Date }): Promise<unknown>;
	findOneAndUpdate(
		filter: { _id: string; status: 'running'; startedAt: { $lt: Date } },
		update: { $set: { startedAt: Date } },
		options: { returnDocument: 'after' }
	): Promise<unknown>;
	updateOne(
		filter: { _id: string; status: 'running'; startedAt: Date },
		update: { $set: Record<string, Date | number | string> }
	): Promise<{ matchedCount: number }>;
	deleteOne(filter: { _id: string; status: 'running'; startedAt: Date }): Promise<unknown>;
}

export interface StoredSvgPreviewCleanupResult {
	scanned: number;
	removed: number;
	missingBinaries: number;
}

@Injectable()
export class StoredSvgPreviewCleanupService implements OnApplicationBootstrap {
	private taskStartedAt?: Date;

	constructor(
		@Inject(FILE_RECORD_REPO) private readonly fileRecordRepo: FileRecordRepo,
		@Inject(FILES_STORAGE_S3_CONNECTION) private readonly storageClient: S3ClientAdapter,
		@Inject(FILE_STORAGE_CONFIG_TOKEN) private readonly config: FileStorageConfig,
		private readonly filesStorageService: FilesStorageService,
		private readonly previewService: PreviewService,
		private readonly em: EntityManager,
		private readonly logger: Logger
	) {
		this.logger.setContext(StoredSvgPreviewCleanupService.name);
	}

	public onApplicationBootstrap(): void {
		if (!this.shouldRunOnStartup()) {
			return;
		}

		void this.runOnce();
	}

	public async runOnce(): Promise<void> {
		try {
			const acquired = await this.acquireTask();

			if (!acquired) {
				this.logger.info(
					new StoredSvgPreviewCleanupLoggable('Stored SVG/XML preview cleanup is already finished or still running', {})
				);

				return;
			}

			const result = await this.removeStoredSvgAndXmlPreviews();
			await this.completeTask(result);
		} catch (error) {
			try {
				await this.releaseTask();
			} catch (releaseError) {
				this.logger.warning(
					new StoredSvgPreviewCleanupLoggable('Stored SVG/XML preview cleanup could not release its task', {
						error: releaseError instanceof Error ? releaseError.message : 'unknown',
					})
				);
			}

			this.logger.warning(
				new StoredSvgPreviewCleanupLoggable('Stored SVG/XML preview cleanup failed', {
					error: error instanceof Error ? error.message : 'unknown',
				})
			);
		}
	}

	public async removeStoredSvgAndXmlPreviews(): Promise<StoredSvgPreviewCleanupResult> {
		const result: StoredSvgPreviewCleanupResult = { scanned: 0, removed: 0, missingBinaries: 0 };
		let afterId: EntityId | undefined;

		for (;;) {
			const page = await this.fileRecordRepo.findStoredSvgPreviewCandidates(afterId, CLEANUP_PAGE_SIZE);

			if (page.length === 0) {
				break;
			}

			await this.touchTask();
			await this.inspectPage(page, result);
			afterId = page[page.length - 1].id;
		}

		this.logger.info(
			new StoredSvgPreviewCleanupLoggable('Removed stored files whose bytes are SVG or XML', { ...result })
		);

		return result;
	}

	private shouldRunOnStartup(): boolean {
		return this.config.cleanupStoredSvgXmlPreviews && process.env.NODE_ENV === 'production';
	}

	private async inspectPage(page: FileRecord[], result: StoredSvgPreviewCleanupResult): Promise<void> {
		const matches: FileRecord[] = [];

		for (const fileRecord of page) {
			const prefix = await this.readPrefix(fileRecord);

			if (!prefix) {
				result.missingBinaries += 1;
				continue;
			}

			result.scanned += 1;

			if (isSvgOrXmlContent(prefix)) {
				matches.push(fileRecord);
			}
		}

		if (matches.length === 0) {
			return;
		}

		await this.previewService.deletePreviews(matches);
		await this.filesStorageService.deleteFiles(matches);
		result.removed += matches.length;
	}

	private async readPrefix(fileRecord: FileRecord): Promise<Buffer | undefined> {
		const path = FilePathFactory.create(fileRecord);

		try {
			return await this.readLimited(await this.storageClient.get(path, SNIFF_RANGE));
		} catch (error) {
			if (error instanceof NotFoundException) {
				return undefined;
			}

			if (!this.isUnsatisfiableRange(error)) {
				throw error;
			}
		}

		try {
			return await this.readLimited(await this.storageClient.get(path));
		} catch (error) {
			if (error instanceof NotFoundException) {
				return undefined;
			}

			throw error;
		}
	}

	private readLimited(file: GetFile): Promise<Buffer> {
		return readStreamPrefix(file.data, SVG_XML_SNIFF_BYTE_COUNT);
	}

	private isUnsatisfiableRange(error: unknown): boolean {
		if (!(error instanceof InternalServerErrorException)) {
			return false;
		}

		return this.hasRangeSignal(error.cause) || this.hasRangeSignal(error);
	}

	private hasRangeSignal(value: unknown): boolean {
		const name = TypeGuard.getValueFromObjectKey(value, 'name');
		const code = TypeGuard.getValueFromObjectKey(value, 'Code');
		const message = TypeGuard.getValueFromObjectKey(value, 'message');
		const metadata = TypeGuard.getValueFromObjectKey(value, '$metadata');
		const status = TypeGuard.getValueFromObjectKey(metadata, 'httpStatusCode');
		const mentionsInvalidRange = typeof message === 'string' && message.includes('InvalidRange');

		return name === 'InvalidRange' || code === 'InvalidRange' || status === 416 || mentionsInvalidRange;
	}

	private async acquireTask(): Promise<boolean> {
		const startedAt = new Date();

		try {
			await this.collection().insertOne({
				_id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID,
				status: 'running',
				startedAt,
			});
			this.taskStartedAt = startedAt;

			return true;
		} catch (error) {
			if (!this.isDuplicateKey(error)) {
				throw error;
			}
		}

		const claimed = await this.collection().findOneAndUpdate(
			{
				_id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID,
				status: 'running',
				startedAt: { $lt: new Date(Date.now() - STALE_TASK_AFTER_MS) },
			},
			{ $set: { startedAt } },
			{ returnDocument: 'after' }
		);

		if (claimed == null) {
			return false;
		}

		this.taskStartedAt = startedAt;

		return true;
	}

	private async touchTask(): Promise<void> {
		if (!this.taskStartedAt) {
			return;
		}

		const startedAt = new Date();
		const updated = await this.collection().updateOne(
			{ _id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID, status: 'running', startedAt: this.taskStartedAt },
			{ $set: { startedAt } }
		);

		if (updated.matchedCount === 1) {
			this.taskStartedAt = startedAt;
		}
	}

	private async completeTask(result: StoredSvgPreviewCleanupResult): Promise<void> {
		if (!this.taskStartedAt) {
			return;
		}

		await this.collection().updateOne(
			{ _id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID, status: 'running', startedAt: this.taskStartedAt },
			{
				$set: {
					status: 'completed',
					completedAt: new Date(),
					scanned: result.scanned,
					removed: result.removed,
					missingBinaries: result.missingBinaries,
				},
			}
		);
		this.taskStartedAt = undefined;
	}

	private async releaseTask(): Promise<void> {
		if (!this.taskStartedAt) {
			return;
		}

		await this.collection().deleteOne({
			_id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID,
			status: 'running',
			startedAt: this.taskStartedAt,
		});
		this.taskStartedAt = undefined;
	}

	private collection(): CleanupTaskCollection {
		return this.em.getCollection(STORED_SVG_PREVIEW_CLEANUP_COLLECTION) as unknown as CleanupTaskCollection;
	}

	private isDuplicateKey(error: unknown): boolean {
		const code = TypeGuard.getValueFromObjectKey(error, 'code');
		const codeName = TypeGuard.getValueFromObjectKey(error, 'codeName');

		return code === 11000 || codeName === 'DuplicateKey';
	}
}
