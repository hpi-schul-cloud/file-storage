import { AntivirusService, ScanResult } from '@infra/antivirus';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { CopyFiles, S3ClientAdapter } from '@infra/s3-client';
import {
	ConflictException,
	Inject,
	Injectable,
	InternalServerErrorException,
	NotAcceptableException,
	NotFoundException,
} from '@nestjs/common';
import { Counted, EntityId } from '@shared/domain/types';
import { Readable } from 'stream';
import { FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from '../../files-storage.config';
import { FileDto } from '../dto';
import { ErrorType } from '../error';
import { ArchiveFactory, FileDtoFactory, FileRecordFactory, StreamFileSizeObserver } from '../factory';
import { FileRecord, ParentInfo } from '../file-record.do';
import {
	CollaboraEditabilityStatus,
	CopyFileResult,
	FILE_RECORD_REPO,
	FileRecordRepo,
	FileRecordStatus,
	FileRecordWithStatus,
	GetFileResponse,
	StorageLocationParams,
} from '../interface';
import { FileStorageActionsLoggable, StorageLocationDeleteLoggableException } from '../loggable';
import { FileResponseFactory, ScanResultDtoMapper } from '../mapper';
import { ParentStatistic, ScanStatus } from '../vo';
import { cloneStream, detectMimeTypeByStream } from './stream.utils';

@Injectable()
export class FilesStorageService {
	constructor(
		@Inject(FILE_RECORD_REPO) private readonly fileRecordRepo: FileRecordRepo,
		@Inject(FILES_STORAGE_S3_CONNECTION) private readonly storageClient: S3ClientAdapter,
		private readonly antivirusService: AntivirusService,
		private readonly config: FileStorageConfig,
		private readonly logger: Logger,
		private readonly domainErrorHandler: DomainErrorHandler
	) {
		this.logger.setContext(FilesStorageService.name);
	}

	// find
	public async getFileRecord(fileRecordId: EntityId): Promise<FileRecord> {
		const fileRecord = await this.fileRecordRepo.findOneById(fileRecordId);

		return fileRecord;
	}

	public getFileRecords(fileRecordIds: EntityId[]): Promise<Counted<FileRecord[]>> {
		const fileRecords = this.fileRecordRepo.findMultipleById(fileRecordIds);

		return fileRecords;
	}

	public async getFileRecordBySecurityCheckRequestToken(token: string): Promise<FileRecord> {
		const fileRecord = await this.fileRecordRepo.findBySecurityCheckRequestToken(token);

		return fileRecord;
	}

	public async getFileRecordMarkedForDelete(fileRecordId: EntityId): Promise<FileRecord> {
		const fileRecord = await this.fileRecordRepo.findOneByIdMarkedForDelete(fileRecordId);

		return fileRecord;
	}

	public async getFileRecordsByParent(parentId: EntityId): Promise<Counted<FileRecord[]>> {
		const countedFileRecords = await this.fileRecordRepo.findByParentId(parentId);

		return countedFileRecords;
	}

	public async getFileRecordsMarkedForDeleteByParent(parentId: EntityId): Promise<Counted<FileRecord[]>> {
		const countedFileRecords = await this.fileRecordRepo.findMarkedForDeleteByParentId(parentId);

		return countedFileRecords;
	}

	public async getFileRecordsByCreatorId(creatorId: EntityId): Promise<Counted<FileRecord[]>> {
		const countedFileRecords = await this.fileRecordRepo.findByCreatorId(creatorId);

		return countedFileRecords;
	}

	// generate status
	public getFileRecordStatus(fileRecord: FileRecord): FileRecordStatus {
		const scanStatus = fileRecord.scanStatus;
		const previewStatus = fileRecord.getPreviewStatus();
		const collaboraEditabilityStatus = this.getCollaboraEditabilityStatus(fileRecord);

		const status = {
			scanStatus,
			previewStatus,
			...collaboraEditabilityStatus,
		};

		return status;
	}

	public getCollaboraEditabilityStatus(fileRecord: FileRecord): CollaboraEditabilityStatus {
		const status = {
			isCollaboraEditable: fileRecord.isCollaboraEditable(this.config.COLLABORA_MAX_FILE_SIZE_IN_BYTES),
			exceedsCollaboraEditableFileSize: fileRecord.exceedsCollaboraEditableFileSize(
				this.config.COLLABORA_MAX_FILE_SIZE_IN_BYTES
			),
		};

		return status;
	}

	public getFileRecordsWithStatus(fileRecords: FileRecord[]): FileRecordWithStatus[] {
		return fileRecords.map((fileRecord) => ({
			fileRecord,
			status: this.getFileRecordStatus(fileRecord),
		}));
	}

	// upload
	public async uploadFile(userId: EntityId, parentInfo: ParentInfo, sourceFile: FileDto): Promise<FileRecord> {
		const fileName = await this.resolveFileName(sourceFile, parentInfo);

		const streamForDetection = cloneStream(sourceFile.data);
		const streamForStorage = cloneStream(sourceFile.data);
		const mimeType = await detectMimeTypeByStream(streamForDetection, sourceFile.mimeType);

		const file = FileDtoFactory.create(fileName, streamForStorage, mimeType, sourceFile.abortSignal);
		const fileRecord = FileRecordFactory.buildFromExternalInput(fileName, mimeType, parentInfo, userId);

		await this.fileRecordRepo.save(fileRecord);
		await this.storeAndScanFileWithRollback(fileRecord, file);

		return fileRecord;
	}

	public async updateFileContents(fileRecord: FileRecord, sourceStream: Readable): Promise<FileRecord> {
		const streamForDetection = cloneStream(sourceStream);
		const streamForStorage = cloneStream(sourceStream);
		const mimeType = await detectMimeTypeByStream(streamForDetection, fileRecord.mimeType);
		this.checkMimeType(fileRecord, mimeType);

		const file = FileDtoFactory.create(fileRecord.getName(), streamForStorage, mimeType);
		await this.storeAndScanFile(fileRecord, file);

		return fileRecord;
	}

	private checkMimeType(fileRecord: FileRecord, mimeType: string): void {
		if (fileRecord.mimeType !== mimeType) {
			throw new ConflictException(ErrorType.MIME_TYPE_MISMATCH);
		}
	}

	private async resolveFileName(file: FileDto, parentInfo: ParentInfo): Promise<string> {
		let fileName = file.name;

		const [fileRecordsOfParent, count] = await this.getFileRecordsByParent(parentInfo.parentId);
		if (count > 0) {
			fileName = FileRecord.resolveFileNameDuplicates(fileRecordsOfParent, file.name);
		}

		return fileName;
	}

	private async storeAndScanFileWithRollback(fileRecord: FileRecord, file: FileDto): Promise<void> {
		try {
			await this.storeAndScanFile(fileRecord, file);
		} catch (error) {
			const filePath = fileRecord.createPath();
			await Promise.allSettled([this.storageClient.delete([filePath]), this.fileRecordRepo.delete(fileRecord)]);

			throw error;
		}
	}

	private shouldStreamToAntivirus(fileRecord: FileRecord): boolean {
		const isCollaboraEditable = fileRecord.isCollaboraEditable(this.config.COLLABORA_MAX_FILE_SIZE_IN_BYTES);
		const shouldStreamToAntiVirus =
			this.config.FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS && (fileRecord.isPreviewPossible() || isCollaboraEditable);

		return shouldStreamToAntiVirus;
	}

	private async storeAndScanFile(fileRecord: FileRecord, file: FileDto): Promise<void> {
		const streamCompletion = this.awaitStreamCompletion(file);
		const fileSizeObserver = StreamFileSizeObserver.create(file.data);
		const filePath = fileRecord.createPath();

		const shouldStreamToAntiVirus = this.shouldStreamToAntivirus(fileRecord);

		if (shouldStreamToAntiVirus) {
			const pipedStream = cloneStream(file.data);

			const [, antivirusClientResponse] = await Promise.all([
				this.storageClient.create(filePath, file),
				this.antivirusService.scanStream(pipedStream),
			]);
			const { status, reason } = ScanResultDtoMapper.fromScanResult(antivirusClientResponse);
			fileRecord.updateSecurityCheckStatus(status, reason);
		} else {
			await this.storageClient.create(filePath, file);
		}

		await this.throwOnIncompleteStream(streamCompletion);

		const fileRecordSize = fileSizeObserver.getFileSize();
		fileRecord.markAsUploaded(fileRecordSize, this.config.FILES_STORAGE_MAX_FILE_SIZE);
		fileRecord.touchContentLastModifiedAt();
		if (fileRecordSize > this.config.FILES_STORAGE_MAX_SECURITY_CHECK_FILE_SIZE) {
			fileRecord.updateSecurityCheckStatus(ScanStatus.WONT_CHECK, 'File is too big');
		}

		await this.fileRecordRepo.save(fileRecord);

		if (!shouldStreamToAntiVirus && !fileRecord.isWontCheck()) {
			await this.antivirusService.send(fileRecord.getSecurityToken());
		}
	}

	private async throwOnIncompleteStream(streamPromise: Promise<void>): Promise<void> {
		try {
			await streamPromise;
		} catch (err) {
			throw new InternalServerErrorException('File stream error', { cause: err });
		}
	}

	private awaitStreamCompletion(file: FileDto): Promise<void> {
		const { data, abortSignal } = file;

		return new Promise((resolve, reject) => {
			if (abortSignal?.aborted) {
				return resolve();
			}

			const onAbort = (): void => {
				resolve();
			};

			const onEnd = (): void => {
				resolve();
			};

			const onError = (error: Error): void => {
				reject(error);
			};

			const onClose = (): void => {
				resolve();
			};

			if (abortSignal) {
				abortSignal.addEventListener('abort', onAbort);
			}

			data.on('end', onEnd);
			data.on('error', onError);
			data.on('close', onClose);
		});
	}

	// update
	private checkDuplicatedNames(fileRecords: FileRecord[], newFileName: string, currentFileRecordId: EntityId): void {
		const duplicateFound = fileRecords.find((item) => item.id !== currentFileRecordId && item.hasName(newFileName));

		if (duplicateFound) {
			throw new ConflictException(ErrorType.FILE_NAME_EXISTS);
		}
	}

	public async patchFilename(fileRecord: FileRecord, fileName: string): Promise<FileRecord> {
		const parentInfo = fileRecord.getParentInfo();
		const [fileRecords] = await this.getFileRecordsByParent(parentInfo.parentId);

		this.checkDuplicatedNames(fileRecords, fileName, fileRecord.id);
		fileRecord.setName(fileName);
		await this.fileRecordRepo.save(fileRecord);

		return fileRecord;
	}

	public async updateSecurityStatus(token: string, scanResult: ScanResult): Promise<void> {
		const fileRecord = await this.fileRecordRepo.findBySecurityCheckRequestToken(token);

		const { status, reason } = ScanResultDtoMapper.fromScanResult(scanResult);
		fileRecord.updateSecurityCheckStatus(status, reason);

		await this.fileRecordRepo.save(fileRecord);
	}

	// download
	public checkFileName(fileRecord: FileRecord, fileName: string): void | NotFoundException {
		if (!fileRecord.hasName(fileName)) {
			this.logger.debug(
				new FileStorageActionsLoggable(`could not find file by filename`, {
					action: 'checkFileName',
					sourcePayload: fileRecord,
				})
			);
			throw new NotFoundException(ErrorType.FILE_NOT_FOUND);
		}
	}

	private checkScanStatus(fileRecord: FileRecord): void | NotAcceptableException {
		if (fileRecord.isBlocked()) {
			this.logger.warning(
				new FileStorageActionsLoggable(`file is blocked`, { action: 'checkScanStatus', sourcePayload: fileRecord })
			);
			throw new NotAcceptableException(ErrorType.FILE_IS_BLOCKED);
		}
	}

	public async downloadFile(fileRecord: FileRecord, bytesRange?: string): Promise<GetFileResponse> {
		const pathToFile = fileRecord.createPath();
		const file = await this.storageClient.get(pathToFile, bytesRange);
		const fileResponse = FileResponseFactory.create(file, fileRecord.getName());

		return fileResponse;
	}

	public async download(fileRecord: FileRecord, fileName: string, bytesRange?: string): Promise<GetFileResponse> {
		this.checkFileName(fileRecord, fileName);
		this.checkScanStatus(fileRecord);

		const fileResponse = await this.downloadFile(fileRecord, bytesRange);

		return fileResponse;
	}

	public async downloadFilesAsArchive(fileRecords: FileRecord[], archiveName: string): Promise<GetFileResponse> {
		if (fileRecords.length === 0) {
			throw new NotFoundException(ErrorType.FILE_NOT_FOUND);
		}

		const files = await Promise.all(fileRecords.map((fileRecord: FileRecord) => this.downloadFile(fileRecord)));
		const archive = ArchiveFactory.create(files, fileRecords, this.logger);
		const fileResponse = FileResponseFactory.createFromArchive(archiveName, archive);

		return fileResponse;
	}

	// delete and restore
	private async deleteBinaryFiles(fileRecords: FileRecord[]): Promise<void> {
		const paths = FileRecord.getPaths(fileRecords);
		await this.storageClient.moveToTrash(paths);
	}

	private async restoreBinaryFiles(fileRecords: FileRecord[]): Promise<void> {
		const paths = FileRecord.getPaths(fileRecords);
		await this.storageClient.restore(paths);
	}

	private async markFileRecordsForDelete(fileRecords: FileRecord[]): Promise<void> {
		FileRecord.markForDelete(fileRecords);
		await this.fileRecordRepo.save(fileRecords);
	}

	private async restoreFileRecords(fileRecords: FileRecord[]): Promise<void> {
		FileRecord.unmarkForDelete(fileRecords);
		await this.fileRecordRepo.save(fileRecords);
	}

	public async deleteFiles(fileRecords: FileRecord[]): Promise<void> {
		this.logDelete(fileRecords);
		if (fileRecords.length === 0) return;

		await this.markFileRecordsForDelete(fileRecords);

		try {
			await this.deleteBinaryFiles(fileRecords);
		} catch (error) {
			await this.restoreFileRecords(fileRecords);

			throw error;
		}
	}

	public async restoreFiles(fileRecords: FileRecord[]): Promise<void> {
		this.logRestore(fileRecords);
		if (fileRecords.length === 0) return;

		await this.restoreFileRecords(fileRecords);

		try {
			await this.restoreBinaryFiles(fileRecords);
		} catch (error) {
			await this.markFileRecordsForDelete(fileRecords);

			throw error;
		}
	}

	public async removeCreatorIdFromFileRecords(fileRecords: FileRecord[]): Promise<void> {
		FileRecord.removeCreatorId(fileRecords);
		await this.fileRecordRepo.save(fileRecords);
	}

	public async deleteStorageLocationWithAllFiles(params: StorageLocationParams): Promise<number> {
		const { storageLocation, storageLocationId } = params;
		const result = await this.fileRecordRepo.markForDeleteByStorageLocation(storageLocation, storageLocationId);

		this.storageClient.moveDirectoryToTrash(storageLocationId).catch((error) => {
			this.domainErrorHandler.exec(new StorageLocationDeleteLoggableException(params, error));
			/*****************************************************************************
			 * We do not want a rollback of the file records. Need to be fixed manually. *
			 *****************************************************************************/
		});

		return result;
	}

	public async copyFilesToParent(
		userId: EntityId,
		sourceFileRecords: FileRecord[],
		targetParentInfo: ParentInfo
	): Promise<CopyFileResult[]> {
		this.logCopy(sourceFileRecords, targetParentInfo);
		if (sourceFileRecords.length === 0) return [];

		const promises: Promise<CopyFileResult>[] = sourceFileRecords.map(async (sourceFile) => {
			try {
				this.checkScanStatus(sourceFile);

				const targetFile = await this.copyFileRecord(sourceFile, targetParentInfo, userId);
				const copyFileResult = await this.copyFilesWithRollbackOnError(sourceFile, targetFile);

				return copyFileResult;
			} catch (error) {
				this.domainErrorHandler.exec(
					new InternalServerErrorException(`copy file failed for source fileRecordId ${sourceFile.id}`, {
						cause: error,
					})
				);

				const copyFileResult: CopyFileResult = { id: undefined, sourceId: sourceFile.id, name: sourceFile.getName() };

				return copyFileResult;
			}
		});

		const settledPromises = await Promise.all(promises);

		return settledPromises;
	}

	private async copyFileRecord(
		sourceFile: FileRecord,
		targetParentInfo: ParentInfo,
		userId: EntityId
	): Promise<FileRecord> {
		const fileRecord = FileRecordFactory.copy(sourceFile, userId, targetParentInfo);
		await this.fileRecordRepo.save(fileRecord);

		return fileRecord;
	}

	private async copyFilesWithRollbackOnError(sourceFile: FileRecord, targetFile: FileRecord): Promise<CopyFileResult> {
		try {
			const copyFiles: CopyFiles = {
				sourcePath: sourceFile.createPath(),
				targetPath: targetFile.createPath(),
			};

			await this.storageClient.copy([copyFiles]);
			if (targetFile.isPending() || targetFile.hasSecurityErrorStatus()) {
				await this.antivirusService.send(targetFile.getSecurityToken());
			}

			const copyFileResult: CopyFileResult = { id: targetFile.id, sourceId: sourceFile.id, name: targetFile.getName() };

			return copyFileResult;
		} catch (error) {
			await this.fileRecordRepo.delete([targetFile]);
			throw error;
		}
	}

	// statistics
	public async getParentStatistic(parentId: EntityId): Promise<ParentStatistic> {
		const statistics = await this.fileRecordRepo.getStatisticByParentId(parentId);

		return statistics;
	}

	private logCopy(sourceFileRecords: FileRecord[], targetParentInfo: ParentInfo): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start copy of FileRecords', {
				action: 'copy',
				sourcePayload: sourceFileRecords,
				targetPayload: targetParentInfo,
			})
		);
	}

	private logDelete(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start of FileRecords deletion', { action: 'delete', sourcePayload: fileRecords })
		);
	}

	private logRestore(fileRecords: FileRecord[]): void {
		this.logger.debug(
			new FileStorageActionsLoggable('Start restore of FileRecords', { action: 'restore', sourcePayload: fileRecords })
		);
	}

	public async markPreviewGenerationFailed(fileRecord: FileRecord): Promise<void> {
		fileRecord.markPreviewGenerationFailed();
		await this.fileRecordRepo.save([fileRecord]);

		this.logger.warning(
			new FileStorageActionsLoggable('Preview generation marked as failed', {
				action: 'previewNotPossible',
				sourcePayload: fileRecord,
			})
		);
	}
}
