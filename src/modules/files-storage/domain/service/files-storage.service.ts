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

	/*
	 * TODO: MAJOR REFACTOR NEEDED - UPLOAD vs UPDATE Consistency
	 *
	 * PROBLEM: uploadFile und updateFileContents haben sehr ähnliche Abläufe, aber inkonsistente Implementierung:
	 * - uploadFile: verwendet storeAndScanFileWithRollback (mit DB + S3 Rollback)
	 * - updateFileContents: verwendet storeAndScanFile direkt (ohne Rollback)
	 * - Beide verwenden detectMimeType, aber unterschiedlich
	 * - storeAndScanFile macht zu viele Aufgaben gleichzeitig
	 *
	 * ZIEL: Clean Code Orchestrierung in public Methoden, gut getrennte private Methoden
	 *
	 * NEUE STRUKTUR:
	 *
	 * uploadFile (CREATE):
	 * 1. prepareNewFileRecord() -> FileRecord erstellen + FileName resolution
	 * 2. validateAndPrepareBinaryContent() -> MIME detection + Stream preparation
	 * 3. persistFileRecord() -> DB speichern
	 * 4. storeBinaryContentWithRollback() -> S3 + Antivirus mit Upload-Rollback
	 *
	 * updateFileContents (UPDATE):
	 * 1. validateMimeTypeConsistency() -> MIME prüfen gegen existierenden FileRecord
	 * 2. prepareBinaryContentForUpdate() -> Stream vorbereiten
	 * 3. storeBinaryContentWithUpdateRollback() -> S3 replace + Antivirus mit Update-Rollback
	 * 4. updateFileMetadata() -> FileRecord Metadaten aktualisieren
	 *
	 * PRIVATE METHODEN (neu strukturiert):
	 * - storeBinaryFile() -> Nur S3 create/update
	 * - performAntivirusScan() -> Nur Antivirus (stream oder async)
	 * - updateFileRecordMetadata() -> Nur FileRecord Updates
	 * - rollbackFailedUpload() -> Upload-spezifisches Rollback
	 * - rollbackFailedUpdate() -> Update-spezifisches Rollback
	 *
	 * HINWEIS: Möglicherweise sind auch Änderungen in FilesStorageUC.uploadFile/updateFileContents nötig,
	 * um die Orchestrierung dort zu berücksichtigen.
	 */

	// upload
	public async uploadFile(userId: EntityId, parentInfo: ParentInfo, file: FileDto): Promise<FileRecord> {
		// TODO: REFACTOR - Diese Methode sollte als Orchestrator fungieren und folgende Schritte ausführen:
		// 1. this.prepareNewFileRecord(userId, parentInfo, file) -> FileRecord erstellen
		// 2. this.validateAndPrepareBinaryContent(file) -> MIME Type Detection, FileName Resolution
		// 3. this.persistFileRecord(fileRecord) -> Speichern in DB
		// 4. this.storeBinaryContentWithRollback(fileRecord, preparedFile) -> Binäre Datei speichern + Antivirus
		//
		// Aktuell: Zu viele Details in der öffentlichen Methode, storeAndScanFileWithRollback macht zu viel

		const fileName = await this.resolveFileName(file, parentInfo);
		const { mimeType, stream } = await this.detectMimeType(file.data, file.mimeType);
		const fileRecord = FileRecordFactory.buildFromExternalInput(fileName, mimeType, parentInfo, userId);

		// MimeType Detection consumes part of the stream, so the restored stream is passed on
		// remapped need to be removed, see this.updateFileContents
		file.data = stream;
		file.mimeType = fileRecord.mimeType;
		await this.fileRecordRepo.save(fileRecord);

		await this.storeAndScanFileWithRollback(fileRecord, file);

		return fileRecord;
	}

	public async updateFileContents(fileRecord: FileRecord, readable: Readable): Promise<FileRecord> {
		// TODO: REFACTOR - Diese Methode sollte als Orchestrator fungieren und folgende Schritte ausführen:
		// 1. this.validateMimeTypeConsistency(fileRecord, readable) -> MIME Type prüfen & Stream vorbereiten
		// 2. this.storeBinaryContentForUpdate(fileRecord, preparedFile) -> Binäre Datei aktualisieren + Antivirus
		// 3. this.updateFileMetadataAfterContentChange(fileRecord) -> Metadaten aktualisieren (size, lastModified, etc.)
		//
		// Aktuell: updateFileContents verwendet storeAndScanFile direkt, aber uploadFile verwendet storeAndScanFileWithRollback
		// Das sollte konsistenter sein - beide brauchen ähnliche Fehlerbehandlung, aber unterschiedliche Rollback-Strategien
		//
		// HINWEIS: Diese Methode wird von WopiService.updateFileContents() verwendet - Interface muss gleich bleiben

		const { mimeType, stream } = await this.detectMimeType(readable, fileRecord.mimeType);
		this.checkMimeType(fileRecord.mimeType, mimeType);

		const file = FileDtoFactory.create(fileRecord.getName(), stream, mimeType);
		await this.storeAndScanFile(fileRecord, file);

		return fileRecord;
	}

	private checkMimeType(oldMimeType: string, newMimeType: string): void {
		if (oldMimeType !== newMimeType) {
			throw new ConflictException(ErrorType.MIME_TYPE_MISMATCH);
		}
	}

	private async detectMimeType(
		data: Readable,
		expectedMimeType: string
	): Promise<{ mimeType: string; stream: Readable }> {
		if (this.isStreamMimeTypeDetectionPossible(expectedMimeType)) {
			const source = this.createPipedStream(data);
			const { stream, mime: detectedMimeType } = await this.detectMimeTypeByStream(source);

			const mimeType = detectedMimeType ?? expectedMimeType;

			return { mimeType, stream };
		}

		return { mimeType: expectedMimeType, stream: data };
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

		const [fileRecordsOfParent, count] = await this.getFileRecordsByParent(parentInfo.parentId);
		if (count > 0) {
			fileName = FileRecord.resolveFileNameDuplicates(fileRecordsOfParent, file.name);
		}

		return fileName;
	}

	private async storeAndScanFileWithRollback(fileRecord: FileRecord, file: FileDto): Promise<void> {
		// TODO: REFACTOR - Diese Methode sollte umbenannt werden zu "storeBinaryContentWithRollback"
		// und spezifisch für Upload-Operationen gedacht sein. Update-Operationen brauchen andere Rollback-Logik.
		//
		// Für Update: Falls Fehler auftritt, sollte die alte Datei wiederhergestellt werden, nicht gelöscht
		// Für Upload: Falls Fehler auftritt, sollte sowohl FileRecord als auch Binärdatei gelöscht werden

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
		// TODO: REFACTOR - Diese Methode macht zu viele verschiedene Dinge und sollte aufgeteilt werden:
		// 1. this.storeBinaryFile(fileRecord, file) -> Nur das Speichern der Binärdatei
		// 2. this.performAntivirusScan(fileRecord, file) -> Antivirus-Scanning (Stream oder asynchron)
		// 3. this.updateFileRecordAfterStorage(fileRecord, fileSize) -> FileRecord Metadaten aktualisieren
		// 4. this.triggerAsyncAntivirusIfNeeded(fileRecord) -> Asynchrones Antivirus falls erforderlich
		//
		// Problem: Diese Methode wird sowohl für Upload als auch Update verwendet, aber die Logik
		// sollte sich unterscheiden (Upload = create, Update = replace/update in S3)

		const streamCompletion = this.awaitStreamCompletion(file);
		const fileSizeObserver = StreamFileSizeObserver.create(file.data);
		const filePath = fileRecord.createPath();

		const shouldStreamToAntiVirus = this.shouldStreamToAntivirus(fileRecord);

		if (shouldStreamToAntiVirus) {
			const pipedStream = this.createPipedStream(file.data);

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
