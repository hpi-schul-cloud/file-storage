import {
	AuthorizationClientAdapter,
	AuthorizationContextBuilder,
	AuthorizationContextParams,
	AuthorizationContextParamsRequiredPermissions,
} from '@infra/authorization-client';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { EntityManager, RequestContext } from '@mikro-orm/mongodb';
import { ToManyDifferentParentsException } from '@modules/files-storage/loggable';
import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, NotFoundException, RequestTimeoutException } from '@nestjs/common';
import { Counted, EntityId } from '@shared/domain/types';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import busboy from 'busboy';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import internal from 'stream';
import {
	ErrorType,
	FileRecord,
	FileRecordParentType,
	FilesStorageMapper,
	FilesStorageService,
	GetFileResponse,
	ParentInfo,
	PreviewService,
	StorageLocation,
} from '../../domain';
import {
	ArchiveFileParams,
	CopyFileResponse,
	DownloadFileParams,
	FileRecordListResponse,
	FileRecordParams,
	FileRecordResponse,
	FileUrlParams,
	MultiFileParams,
	PaginationParams,
	ParentParams,
	ParentStatisticResponse,
	PreviewParams,
	RenameFileParams,
	ScanResultParams,
	SingleFileParams,
} from '../dto';
import { FileDtoMapper, FileRecordMapper, ParentStatisticMapper, PreviewBuilder } from '../mapper';

export const FileStorageAuthorizationContext = {
	create: AuthorizationContextBuilder.write([AuthorizationContextParamsRequiredPermissions.FILESTORAGE_CREATE]),
	read: AuthorizationContextBuilder.read([AuthorizationContextParamsRequiredPermissions.FILESTORAGE_VIEW]),
	update: AuthorizationContextBuilder.write([AuthorizationContextParamsRequiredPermissions.FILESTORAGE_EDIT]),
	delete: AuthorizationContextBuilder.write([AuthorizationContextParamsRequiredPermissions.FILESTORAGE_REMOVE]),
};

@Injectable()
export class FilesStorageUC {
	constructor(
		private readonly logger: Logger,
		private readonly authorizationClientAdapter: AuthorizationClientAdapter,
		private readonly httpService: HttpService,
		private readonly filesStorageService: FilesStorageService,
		private readonly previewService: PreviewService,
		// maybe better to pass the request context from controller and avoid em at this place
		private readonly em: EntityManager,
		private readonly domainErrorHandler: DomainErrorHandler
	) {
		this.logger.setContext(FilesStorageUC.name);
	}

	// upload
	public async upload(userId: EntityId, params: FileRecordParams, req: Request): Promise<FileRecordResponse> {
		await Promise.all([
			this.checkPermission(params, FileStorageAuthorizationContext.create),
			this.checkStorageLocationCanRead(params.storageLocation, params.storageLocationId),
		]);

		const fileRecord = await this.uploadFileWithBusboy(userId, params, req);
		const status = this.filesStorageService.getFileRecordStatus(fileRecord);
		const fileRecordResponse = FileRecordMapper.mapToFileRecordResponse(fileRecord, status);

		return fileRecordResponse;
	}

	public async uploadFromUrl(userId: EntityId, params: FileRecordParams & FileUrlParams): Promise<FileRecordResponse> {
		await this.checkPermission(params, FileStorageAuthorizationContext.create);
		await this.checkStorageLocationCanRead(params.storageLocation, params.storageLocationId);

		const response = await this.getResponse(params);
		const fileDto = FileDtoMapper.mapFromAxiosResponse(params.fileName, response);
		const fileRecord = await this.filesStorageService.uploadFile(userId, params, fileDto);

		const status = this.filesStorageService.getFileRecordStatus(fileRecord);
		const fileRecordResponse = FileRecordMapper.mapToFileRecordResponse(fileRecord, status);

		return fileRecordResponse;
	}

	// download
	public async download(params: DownloadFileParams, bytesRange?: string): Promise<GetFileResponse> {
		const fileRecord = await this.filesStorageService.getFileRecord(params.fileRecordId);
		const parentInfo = fileRecord.getParentInfo();

		await this.checkPermission(parentInfo, FileStorageAuthorizationContext.read);

		return this.filesStorageService.download(fileRecord, params.fileName, bytesRange);
	}

	public async downloadBySecurityToken(token: string): Promise<GetFileResponse> {
		const fileRecord = await this.filesStorageService.getFileRecordBySecurityCheckRequestToken(token);
		const res = await this.filesStorageService.downloadFile(fileRecord);

		return res;
	}

	public async downloadPreview(
		params: DownloadFileParams,
		previewParams: PreviewParams,
		bytesRange?: string
	): Promise<GetFileResponse> {
		const fileRecord = await this.filesStorageService.getFileRecord(params.fileRecordId);

		if (fileRecord.previewGenerationFailed() && fileRecord.isPreviewPossible()) {
			throw new NotFoundException(ErrorType.PREVIEW_NOT_POSSIBLE);
		}

		const parentInfo = fileRecord.getParentInfo();

		await this.checkPermission(parentInfo, FileStorageAuthorizationContext.read);
		this.filesStorageService.checkFileName(fileRecord, params.fileName);

		const previewFileParams = PreviewBuilder.buildParams(fileRecord, previewParams, bytesRange);
		try {
			const fileResponse = await this.previewService.download(fileRecord, previewFileParams);

			return fileResponse;
		} catch (error) {
			if (error instanceof RequestTimeoutException) {
				await this.filesStorageService.previewNotPossible(fileRecord);
				throw new NotFoundException(ErrorType.PREVIEW_NOT_POSSIBLE);
			}
			throw error;
		}
	}

	public async downloadFilesOfParentAsArchive(params: ArchiveFileParams): Promise<GetFileResponse> {
		const [fileRecords] = await this.filesStorageService.getFileRecords(params.fileRecordIds);
		const parentInfo = this.extractSingleParentInfoOrThrow(fileRecords);

		await this.checkPermission(parentInfo, FileStorageAuthorizationContext.read);

		const fileResponse = await this.filesStorageService.downloadFilesAsArchive(fileRecords, params.archiveName);

		return fileResponse;
	}

	// delete
	public async deleteFilesOfParent(params: FileRecordParams): Promise<FileRecordListResponse> {
		const [fileRecords, count] = await this.filesStorageService.getFileRecordsByParent(params.parentId);
		const parentInfo = params;

		await this.checkDeletePermission(parentInfo);

		await this.deletePreviewsAndFiles(fileRecords);
		const fileRecordsWithStatus = this.filesStorageService.getFileRecordsWithStatus(fileRecords);
		const fileRecordListResponse = FileRecordMapper.mapToFileRecordListResponse(fileRecordsWithStatus, count);

		return fileRecordListResponse;
	}

	public async deleteFile(params: SingleFileParams): Promise<FileRecordResponse> {
		const fileRecord = await this.filesStorageService.getFileRecord(params.fileRecordId);
		const parentInfo = fileRecord.getParentInfo();

		await this.checkDeletePermission(parentInfo);

		await this.deletePreviewsAndFiles([fileRecord]);
		const status = this.filesStorageService.getFileRecordStatus(fileRecord);
		const fileRecordResponse = FileRecordMapper.mapToFileRecordResponse(fileRecord, status);

		return fileRecordResponse;
	}

	public async deleteMultipleFilesOfParent(params: MultiFileParams): Promise<FileRecordListResponse> {
		const [fileRecords, count] = await this.filesStorageService.getFileRecords(params.fileRecordIds);
		const parentInfo = this.extractSingleParentInfoOrThrow(fileRecords);

		await this.checkDeletePermission(parentInfo);

		await this.deletePreviewsAndFiles(fileRecords);
		const fileRecordWithStatus = this.filesStorageService.getFileRecordsWithStatus(fileRecords);
		const fileRecordListResponse = FileRecordMapper.mapToFileRecordListResponse(fileRecordWithStatus, count);

		return fileRecordListResponse;
	}

	private async deletePreviewsAndFiles(fileRecords: FileRecord[]): Promise<void> {
		await this.previewService.deletePreviews(fileRecords);
		await this.filesStorageService.deleteFiles(fileRecords);
	}

	// restore
	public async restoreFilesOfParent(params: FileRecordParams): Promise<FileRecordListResponse> {
		await this.checkPermission(params, FileStorageAuthorizationContext.create);

		const [fileRecords, count] = await this.filesStorageService.getFileRecordsMarkedForDeleteByParent(params.parentId);
		await this.filesStorageService.restoreFiles(fileRecords);
		const fileRecordWithStatus = this.filesStorageService.getFileRecordsWithStatus(fileRecords);
		const fileRecordListResponse = FileRecordMapper.mapToFileRecordListResponse(fileRecordWithStatus, count);

		return fileRecordListResponse;
	}

	public async restoreFile(params: SingleFileParams): Promise<FileRecordResponse> {
		const fileRecord = await this.filesStorageService.getFileRecordMarkedForDelete(params.fileRecordId);
		const parentInfo = fileRecord.getParentInfo();

		await this.checkPermission(parentInfo, FileStorageAuthorizationContext.create);

		await this.filesStorageService.restoreFiles([fileRecord]);
		const status = this.filesStorageService.getFileRecordStatus(fileRecord);
		const fileRecordResponse = FileRecordMapper.mapToFileRecordResponse(fileRecord, status);

		return fileRecordResponse;
	}

	// copy
	public async copyFilesOfParent(
		userId: string,
		params: FileRecordParams,
		targetParams: FileRecordParams
	): Promise<Counted<CopyFileResponse[]>> {
		await Promise.all([
			this.checkPermission(params, FileStorageAuthorizationContext.create),
			this.checkPermission(targetParams, FileStorageAuthorizationContext.create),
		]);

		const [fileRecords, count] = await this.filesStorageService.getFileRecordsByParent(params.parentId);
		const copyFileResults = await this.filesStorageService.copyFilesToParent(userId, fileRecords, targetParams);

		return [copyFileResults, count];
	}

	public async copyFile(
		userId: string,
		params: SingleFileParams,
		targetParams: FileRecordParams
	): Promise<CopyFileResponse> {
		const fileRecord = await this.filesStorageService.getFileRecord(params.fileRecordId);
		const parentInfo = fileRecord.getParentInfo();

		await Promise.all([
			this.checkPermission(parentInfo, FileStorageAuthorizationContext.create),
			this.checkPermission(targetParams, FileStorageAuthorizationContext.create),
		]);

		const copyFileResults = await this.filesStorageService.copyFilesToParent(userId, [fileRecord], targetParams);
		const result = copyFileResults[0];

		if (!result) {
			// This case is not possible with the current implementation. When filerecord is not found, an 404 error is thrown before.
			/* istanbul ignore next */
			throw new InternalServerErrorException(ErrorType.NO_SOURCE_FILE_RECORDS_PROVIDED);
		}

		return result;
	}

	// update
	public async patchFilename(params: SingleFileParams, data: RenameFileParams): Promise<FileRecordResponse> {
		const fileRecord = await this.filesStorageService.getFileRecord(params.fileRecordId);
		const parentInfo = fileRecord.getParentInfo();

		await this.checkPermission(parentInfo, FileStorageAuthorizationContext.update);

		const modifiedFileRecord = await this.filesStorageService.patchFilename(fileRecord, data.fileName);
		const status = this.filesStorageService.getFileRecordStatus(modifiedFileRecord);
		const fileRecordResponse = FileRecordMapper.mapToFileRecordResponse(modifiedFileRecord, status);

		return fileRecordResponse;
	}

	public async updateSecurityStatus(token: string, scanResultParams: ScanResultParams): Promise<void> {
		/*************************************
		 * Atm no authorisation is possible. *
		 *************************************/
		await this.filesStorageService.updateSecurityStatus(token, scanResultParams);
	}

	// get
	public async getFileRecord(params: SingleFileParams): Promise<FileRecordResponse> {
		const fileRecord = await this.filesStorageService.getFileRecord(params.fileRecordId);
		const parentInfo = fileRecord.getParentInfo();

		await this.checkPermission(parentInfo, FileStorageAuthorizationContext.read);

		const status = this.filesStorageService.getFileRecordStatus(fileRecord);
		const fileRecordResponse = FileRecordMapper.mapToFileRecordResponse(fileRecord, status);

		return fileRecordResponse;
	}

	public async getFileRecordsOfParent(
		params: FileRecordParams,
		pagination: PaginationParams
	): Promise<FileRecordListResponse> {
		await this.checkPermission(params, FileStorageAuthorizationContext.read);

		const [fileRecords, count] = await this.filesStorageService.getFileRecordsByParent(params.parentId);
		const fileRecordWithStatus = this.filesStorageService.getFileRecordsWithStatus(fileRecords);
		const fileRecordListResponse = FileRecordMapper.mapToFileRecordListResponse(
			fileRecordWithStatus,
			count,
			pagination
		);

		return fileRecordListResponse;
	}

	// statistics
	public async getParentStatistic(params: ParentParams): Promise<ParentStatisticResponse> {
		await this.checkPermission(params, FileStorageAuthorizationContext.read);

		const parentStatistic = await this.filesStorageService.getParentStatistic(params.parentId);
		const parentStatisticResponse = ParentStatisticMapper.toParentStatisticResponse(parentStatistic);

		return parentStatisticResponse;
	}

	// private: stream helper
	private uploadFileWithBusboy(userId: EntityId, params: FileRecordParams, req: Request): Promise<FileRecord> {
		const promise = new Promise<FileRecord>((resolve, reject) => {
			const bb = busboy({ headers: req.headers, defParamCharset: 'utf8' });
			let fileRecordPromise: Promise<FileRecord>;

			bb.on('file', (_name, file, info) => {
				const fileDto = FileDtoMapper.mapFromBusboyFileInfo(info, file);

				fileRecordPromise = RequestContext.create(this.em, () => {
					const record = this.filesStorageService.uploadFile(userId, params, fileDto);

					return record;
				});
			});

			bb.on('finish', () => {
				fileRecordPromise
					.then((result) => resolve(result))
					.catch((error) => {
						req.unpipe(bb);
						reject(new Error('Error by stream uploading', { cause: error }));
					});
			});

			req.pipe(bb);
		});

		return promise;
	}

	private async getResponse(
		params: FileRecordParams & FileUrlParams
	): Promise<AxiosResponse<internal.Readable, unknown>> {
		const config: AxiosRequestConfig = {
			headers: params.headers,
			responseType: 'stream',
		};

		const encodedUrl = this.ensureEncodedUrl(params.url);

		try {
			const responseStream = this.httpService.get<internal.Readable>(encodedUrl, config);

			const response = await firstValueFrom(responseStream);

			/* istanbul ignore next */
			response.data.on('error', (error) => {
				this.domainErrorHandler.exec(error);
			});

			return response;
		} catch (error) {
			throw new NotFoundException(ErrorType.FILE_NOT_FOUND, { cause: error });
		}
	}

	private ensureEncodedUrl(url: string): string {
		const containsEncodedCharacters = (url: string): boolean => {
			return /%[0-9A-Fa-f]{2}/.test(url);
		};

		const encodedUrl = containsEncodedCharacters(url) ? url : encodeURI(url);

		return encodedUrl;
	}

	// private: permission checks
	private async checkPermission(
		parentInfo: { parentType: FileRecordParentType; parentId: EntityId },
		context: AuthorizationContextParams
	): Promise<void> {
		const { parentType, parentId } = parentInfo;
		const referenceType = FilesStorageMapper.mapToAllowedAuthorizationEntityType(parentType);

		await this.authorizationClientAdapter.checkPermissionsByReference(referenceType, parentId, context);
	}

	private async checkDeletePermission(parentInfo: {
		parentType: FileRecordParentType;
		parentId: EntityId;
	}): Promise<void> {
		await this.checkPermission(parentInfo, FileStorageAuthorizationContext.delete);
	}

	private extractSingleParentInfoOrThrow(fileRecords: FileRecord[]): ParentInfo {
		const uniqueParentInfos = FileRecord.getUniqueParentInfos(fileRecords);
		const parentInfo = uniqueParentInfos[0];

		if (uniqueParentInfos.length > 1) {
			throw new ToManyDifferentParentsException(uniqueParentInfos, 1);
		} else if (!parentInfo) {
			throw new NotFoundException(ErrorType.FILE_NOT_FOUND);
		}

		return parentInfo;
	}

	private async checkStorageLocationCanRead(
		storageLocation: StorageLocation,
		storageLocationId: EntityId
	): Promise<void> {
		const referenceType = FilesStorageMapper.mapToAllowedStorageLocationType(storageLocation);
		await this.authorizationClientAdapter.checkPermissionsByReference(
			referenceType,
			storageLocationId,
			AuthorizationContextBuilder.read([])
		);
	}
}
