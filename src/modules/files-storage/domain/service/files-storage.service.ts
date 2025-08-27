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
import { PassThrough, Readable } from 'stream';
import { FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from '../../files-storage.config';
import { FileDto } from '../dto';
import { ErrorType } from '../error';
import { FileRecord, ParentInfo } from '../file-record.do';
import { CopyFileResult, FILE_RECORD_REPO, FileRecordRepo, GetFileResponse, StorageLocationParams } from '../interface';
import { FileStorageActionsLoggable } from '../loggable';
import { FileResponseBuilder, ScanResultDtoMapper } from '../mapper';

import { FileRecordFactory, StreamFileSizeObserver } from '../factory';
import { ParentStatistic, ScanStatus } from '../vo';
import { ArchiveFactory } from './archive.factory';
import { fileTypeStream } from './file-type.helper';

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

	public async getFileRecordsOfParent(parentId: EntityId): Promise<Counted<FileRecord[]>> {
		const countedFileRecords = await this.fileRecordRepo.findByParentId(parentId);

		return countedFileRecords;
	}

	public async getFileRecordsByCreatorId(creatorId: EntityId): Promise<Counted<FileRecord[]>> {
		const countedFileRecords = await this.fileRecordRepo.findByCreatorId(creatorId);

		return countedFileRecords;
	}

	// upload
	public async uploadFile(userId: EntityId, parentInfo: ParentInfo, file: FileDto): Promise<FileRecord> {
		const { fileRecord, stream } = await this.createFileRecordWithResolvedName(file, parentInfo, userId);
		// MimeType Detection consumes part of the stream, so the restored stream is passed on
		file.data = stream;
		file.mimeType = fileRecord.mimeType;
		await this.fileRecordRepo.save(fileRecord);

		await this.createFileInStorageAndDeleteOnError(fileRecord, file);

		return fileRecord;
	}

	public async updateFileContents(fileRecord: FileRecord, file: FileDto): Promise<FileRecord> {
		const { mimeType, stream } = await this.detectMimeType(file);
		this.checkMimeType(fileRecord.mimeType, mimeType);

		// MimeType Detection consumes part of the stream, so the restored stream is passed on
		file.data = stream;

		await this.storeAndScanFile(file, fileRecord);

		return fileRecord;
	}

	private checkMimeType(oldMimeType: string, newMimeType: string): void {
		if (oldMimeType !== newMimeType) {
			throw new ConflictException(ErrorType.MIME_TYPE_MISMATCH);
		}
	}

	private async createFileRecordWithResolvedName(
		file: FileDto,
		parentInfo: ParentInfo,
		userId: EntityId
	): Promise<{ fileRecord: FileRecord; stream: Readable }> {
		const fileName = await this.resolveFileName(file, parentInfo);
		const { mimeType, stream } = await this.detectMimeType(file);

		const fileRecord = FileRecordFactory.buildFromExternalInput(
			fileName,
			mimeType,
			parentInfo,
			userId,
			this.config.COLLABORA_MAX_FILE_SIZE_IN_BYTES
		);

		return { fileRecord, stream };
	}

	private async detectMimeType(file: FileDto): Promise<{ mimeType: string; stream: Readable }> {
		if (this.isStreamMimeTypeDetectionPossible(file.mimeType)) {
			const source = this.createPipedStream(file.data);
			const { stream, mime: detectedMimeType } = await this.detectMimeTypeByStream(source);

			const mimeType = detectedMimeType ?? file.mimeType;

			return { mimeType, stream };
		}

		return { mimeType: file.mimeType, stream: file.data };
	}

	private createPipedStream(data: Readable): PassThrough {
		return data.pipe(new PassThrough());
	}

	private isStreamMimeTypeDetectionPossible(mimeType: string): boolean {
		const mimTypes = [
			'text/csv',
			'image/svg+xml',
			'application/msword',
			'application/vnd.ms-powerpoint',
			'application/vnd.ms-excel',
		];

		const result = !mimTypes.includes(mimeType);

		return result;
	}

	private async detectMimeTypeByStream(file: Readable): Promise<{ mime?: string; stream: Readable }> {
		const stream = await fileTypeStream(file);

		return { mime: stream.fileType?.mime, stream };
	}

	private async resolveFileName(file: FileDto, parentInfo: ParentInfo): Promise<string> {
		let fileName = file.name;

		const [fileRecordsOfParent, count] = await this.getFileRecordsOfParent(parentInfo.parentId);
		if (count > 0) {
			fileName = FileRecord.resolveFileNameDuplicates(fileRecordsOfParent, file.name);
		}

		return fileName;
	}

	private async createFileInStorageAndDeleteOnError(fileRecord: FileRecord, file: FileDto): Promise<void> {
		try {
			await this.storeAndScanFile(file, fileRecord);
		} catch (error) {
			const filePath = fileRecord.createPath();

			await this.storageClient.delete([filePath]);
			await this.fileRecordRepo.delete(fileRecord);

			throw error;
		}
	}

	private async storeAndScanFile(file: FileDto, fileRecord: FileRecord): Promise<void> {
		const streamCompletion = this.awaitStreamCompletion(file.data);
		const useStreamToAntivirus = this.config.FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS;
		const fileSizeObserver = StreamFileSizeObserver.create(file.data);
		const filePath = fileRecord.createPath();

		const shouldStreamToAntiVirus =
			useStreamToAntivirus && (fileRecord.isPreviewPossible() || fileRecord.isCollaboraEditable());

		if (shouldStreamToAntiVirus) {
			const streamToAntivirus = this.createPipedStream(file.data);

			const [, antivirusClientResponse] = await Promise.all([
				this.storageClient.create(filePath, file),
				this.antivirusService.checkStream(streamToAntivirus),
			]);
			const { status, reason } = ScanResultDtoMapper.fromScanResult(antivirusClientResponse);
			fileRecord.updateSecurityCheckStatus(status, reason);
		} else {
			await this.storageClient.create(filePath, file);
		}

		await this.throwOnIncompleteStream(streamCompletion);

		const fileRecordSize = fileSizeObserver.getFileSize();

		fileRecord.markAsUploaded(fileRecordSize, this.getMaxFileSize());
		fileRecord.touchContentLastModifiedAt();

		await this.fileRecordRepo.save(fileRecord);

		if (!shouldStreamToAntiVirus) {
			await this.sendToAntivirus(fileRecord);
		}
	}

	private async throwOnIncompleteStream(streamPromise: Promise<void>): Promise<void> {
		try {
			await streamPromise;
		} catch (err) {
			throw new InternalServerErrorException('File stream error', { cause: err });
		}
	}

	private awaitStreamCompletion(stream: Readable): Promise<void> {
		return new Promise((resolve, reject) => {
			stream.on('end', resolve);
			stream.on('error', reject);
		});
	}

	private async sendToAntivirus(fileRecord: FileRecord): Promise<void> {
		const maxSecurityCheckFileSize = this.config.FILES_STORAGE_MAX_SECURITY_CHECK_FILE_SIZE;

		if (fileRecord.sizeInByte > maxSecurityCheckFileSize) {
			fileRecord.updateSecurityCheckStatus(ScanStatus.WONT_CHECK, 'File is too big');
			await this.fileRecordRepo.save(fileRecord);
		} else {
			await this.antivirusService.send(fileRecord.getSecurityToken());
		}
	}

	public getMaxFileSize(): number {
		const maxFileSize = this.config.FILES_STORAGE_MAX_FILE_SIZE;

		return maxFileSize;
	}

	public getCollaboraMaxFileSize(): number {
		const collaboraMaxFileSize = this.config.COLLABORA_MAX_FILE_SIZE_IN_BYTES;

		return collaboraMaxFileSize;
	}

	// update
	private checkDuplicatedNames(fileRecords: FileRecord[], newFileName: string): void {
		if (fileRecords.find((item) => item.hasName(newFileName))) {
			throw new ConflictException(ErrorType.FILE_NAME_EXISTS);
		}
	}

	public async patchFilename(fileRecord: FileRecord, fileName: string): Promise<FileRecord> {
		const parentInfo = fileRecord.getParentInfo();
		const [fileRecords] = await this.getFileRecordsOfParent(parentInfo.parentId);

		this.checkDuplicatedNames(fileRecords, fileName);
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
		const response = FileResponseBuilder.build(file, fileRecord.getName());

		return response;
	}

	public async download(fileRecord: FileRecord, fileName: string, bytesRange?: string): Promise<GetFileResponse> {
		this.checkFileName(fileRecord, fileName);
		this.checkScanStatus(fileRecord);

		const response = await this.downloadFile(fileRecord, bytesRange);

		return response;
	}

	public async downloadFilesAsArchive(fileRecords: FileRecord[], archiveName: string): Promise<GetFileResponse> {
		if (fileRecords.length === 0) {
			throw new NotFoundException(ErrorType.FILE_NOT_FOUND);
		}

		const files = await Promise.all(fileRecords.map((fileRecord: FileRecord) => this.downloadFile(fileRecord)));

		const archiveType = 'zip';
		const archive = ArchiveFactory.createArchive(files, fileRecords, this.logger, archiveType);

		const fileResponse = FileResponseBuilder.build(
			{
				data: archive,
				contentType: `application/${archiveType}`,
			},
			`${archiveName}.${archiveType}`
		);

		return fileResponse;
	}

	// delete
	private async deleteFilesInFilesStorageClient(fileRecords: FileRecord[]): Promise<void> {
		const paths = FileRecord.getPaths(fileRecords);

		await this.storageClient.moveToTrash(paths);
	}

	private async deleteWithRollbackByError(fileRecords: FileRecord[]): Promise<void> {
		try {
			await this.deleteFilesInFilesStorageClient(fileRecords);
		} catch (error) {
			this.rollbackFileRecords(fileRecords);

			throw error;
		}
	}

	private async rollbackFileRecords(fileRecords: FileRecord[]): Promise<void> {
		FileRecord.unmarkForDelete(fileRecords);
		await this.fileRecordRepo.save(fileRecords);
	}

	public async delete(fileRecords: FileRecord[]): Promise<void> {
		this.logger.debug(
			new FileStorageActionsLoggable('Start of FileRecords deletion', { action: 'delete', sourcePayload: fileRecords })
		);

		FileRecord.markForDelete(fileRecords);
		await this.fileRecordRepo.save(fileRecords);

		await this.deleteWithRollbackByError(fileRecords);
	}

	public async deleteFilesOfParent(fileRecords: FileRecord[]): Promise<void> {
		if (fileRecords.length > 0) {
			await this.delete(fileRecords);
		}
	}

	public async removeCreatorIdFromFileRecords(fileRecords: FileRecord[]): Promise<void> {
		FileRecord.removeCreatorId(fileRecords);
		await this.fileRecordRepo.save(fileRecords);
	}

	public async markForDeleteByStorageLocation(params: StorageLocationParams): Promise<number> {
		const { storageLocation, storageLocationId } = params;
		const result = await this.fileRecordRepo.markForDeleteByStorageLocation(storageLocation, storageLocationId);

		this.storageClient.moveDirectoryToTrash(storageLocationId).catch((error) => {
			this.domainErrorHandler.exec(
				new InternalServerErrorException('Error while moving directory to trash', { cause: error })
			);
		});

		return result;
	}

	// restore
	private async restoreFilesInFileStorageClient(fileRecords: FileRecord[]): Promise<void> {
		const paths = FileRecord.getPaths(fileRecords);

		await this.storageClient.restore(paths);
	}

	private async restoreWithRollbackByError(fileRecords: FileRecord[]): Promise<void> {
		try {
			await this.restoreFilesInFileStorageClient(fileRecords);
		} catch (err) {
			FileRecord.markForDelete(fileRecords);
			await this.fileRecordRepo.save(fileRecords);
			throw err;
		}
	}

	public async restoreFilesOfParent(parentInfo: ParentInfo): Promise<Counted<FileRecord[]>> {
		const [fileRecords, count] = await this.fileRecordRepo.findByStorageLocationIdAndParentIdAndMarkedForDelete(
			parentInfo.storageLocation,
			parentInfo.storageLocationId,
			parentInfo.parentId
		);

		if (count > 0) {
			await this.restore(fileRecords);
		}

		return [fileRecords, count];
	}

	public async restore(fileRecords: FileRecord[]): Promise<void> {
		this.logger.debug(
			new FileStorageActionsLoggable('Start restore of FileRecords', { action: 'restore', sourcePayload: fileRecords })
		);

		FileRecord.unmarkForDelete(fileRecords);
		await this.fileRecordRepo.save(fileRecords);

		await this.restoreWithRollbackByError(fileRecords);
	}

	// copy
	public async copyFilesOfParent(
		userId: string,
		sourceParentInfo: ParentInfo,
		targetParentInfo: ParentInfo
	): Promise<Counted<CopyFileResult[]>> {
		const [fileRecords, count] = await this.fileRecordRepo.findByStorageLocationIdAndParentId(
			sourceParentInfo.storageLocation,
			sourceParentInfo.storageLocationId,
			sourceParentInfo.parentId
		);

		if (count === 0) {
			return [[], 0];
		}

		const response = await this.copy(userId, fileRecords, targetParentInfo);

		return [response, count];
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

	private async sendToAntiVirusService(fileRecord: FileRecord): Promise<void> {
		if (fileRecord.isPending()) {
			await this.antivirusService.send(fileRecord.getSecurityToken());
		}
	}

	private async copyFilesWithRollbackOnError(sourceFile: FileRecord, targetFile: FileRecord): Promise<CopyFileResult> {
		try {
			const copyFiles: CopyFiles = {
				sourcePath: sourceFile.createPath(),
				targetPath: targetFile.createPath(),
			};

			await this.storageClient.copy([copyFiles]);
			await this.sendToAntiVirusService(targetFile);

			const copyFileResult: CopyFileResult = { id: targetFile.id, sourceId: sourceFile.id, name: targetFile.getName() };

			return copyFileResult;
		} catch (error) {
			await this.fileRecordRepo.delete([targetFile]);
			throw error;
		}
	}

	public async copy(
		userId: EntityId,
		sourceFileRecords: FileRecord[],
		targetParentInfo: ParentInfo
	): Promise<CopyFileResult[]> {
		this.logger.debug(
			new FileStorageActionsLoggable('Start copy of FileRecords', {
				action: 'copy',
				sourcePayload: sourceFileRecords,
				targetPayload: targetParentInfo,
			})
		);

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

	// statistics
	public async getParentStatistic(parentId: EntityId): Promise<ParentStatistic> {
		const statistics = await this.fileRecordRepo.getStatisticByParentId(parentId);

		return statistics;
	}
}
