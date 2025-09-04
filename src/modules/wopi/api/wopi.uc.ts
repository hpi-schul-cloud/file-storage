import {
	AuthorizationClientAdapter,
	AuthorizationContextBuilder,
	AuthorizationContextParams,
	AuthorizationContextParamsRequiredPermissions,
} from '@infra/authorization-client';
import { CollaboraService } from '@infra/collabora';
import { Logger } from '@infra/logger';
import { SingleFileParams } from '@modules/files-storage/api/dto'; // TODO: Entsprechung von hier nutzen
import { FileDtoBuilder, FilesStorageMapper } from '@modules/files-storage/api/mapper'; // TODO: puhh darüber muss man noch mal nachdenken
import { FileRecord, FileRecordParentType, FilesStorageService, GetFileResponse } from '@modules/files-storage/domain'; // TODO export location und GetFileResponse?
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { Request } from 'express';
import {
	AuthorizedCollaboraDocumentUrlFactory,
	CollaboraEditabilityStatus,
	WopiAccessToken,
	WopiAccessTokenFactory,
	WopiPayload,
	WopiPayloadFactory,
} from '../domain';
import { WopiConfig } from '../wopi.config';
import {
	AuthorizedCollaboraDocumentUrlParams,
	AuthorizedCollaboraDocumentUrlResponse,
	EditorMode,
	WopiAccessTokenParams,
	WopiFileInfoResponse,
} from './dto';
import { AuthorizedCollaboraDocumentUrlResponseFactory, WopiFileInfoResponseFactory } from './factory';

@Injectable()
export class WopiUc {
	constructor(
		private readonly filesStorageService: FilesStorageService,
		private readonly authorizationClientAdapter: AuthorizationClientAdapter,
		private readonly logger: Logger,
		private readonly collaboraService: CollaboraService,
		private readonly wopiConfig: WopiConfig
	) {
		this.logger.setContext(WopiUc.name);
	}

	public async putFile(query: WopiAccessTokenParams, req: Request): Promise<FileRecord> {
		const result = await this.authorizationClientAdapter.resolveToken(
			query.access_token,
			this.wopiConfig.WOPI_TOKEN_TTL_IN_SECONDS
		);

		const payload = WopiPayloadFactory.buildFromUnknownObject(result.payload);

		const fileRecord = await this.filesStorageService.getFileRecord(payload.fileRecordId);
		const mimeType = fileRecord.getMimeType();
		const name = fileRecord.getName();
		const fileDto = FileDtoBuilder.build(name, req, mimeType);

		const updatedFileRecord = await this.filesStorageService.updateFileContents(fileRecord, fileDto);

		return updatedFileRecord;
	}

	public async getAuthorizedCollaboraDocumentUrl(
		userId: EntityId,
		params: AuthorizedCollaboraDocumentUrlParams
	): Promise<AuthorizedCollaboraDocumentUrlResponse> {
		const { fileRecordId, userDisplayName, editorMode } = params;
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(fileRecordId);
		const { parentId, parentType } = fileRecord.getProps();

		this.throwIfNotCollaboraEditable(fileRecord);

		const canWrite = editorMode === EditorMode.EDIT;
		const payload = WopiPayloadFactory.buildFromParams(fileRecord.id, canWrite, userDisplayName, userId);

		const accessToken = await this.checkPermissionAndCreateAccessToken(parentType, parentId, editorMode, payload);
		const collaboraUrl = await this.collaboraService.discoverUrl(fileRecord.mimeType);

		const url = AuthorizedCollaboraDocumentUrlFactory.buildFromParams(
			collaboraUrl,
			this.wopiConfig.WOPI_URL,
			fileRecord.id,
			accessToken
		);
		const response = AuthorizedCollaboraDocumentUrlResponseFactory.buildFromAuthorizedCollaboraDocumentUrl(url);

		return response;
	}

	public async checkFileInfo(
		params: SingleFileParams,
		wopiToken: WopiAccessTokenParams
	): Promise<WopiFileInfoResponse> {
		const { fileRecordId, userId, userDisplayName, canWrite } = await this.getWopiPayload(params, wopiToken);
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(fileRecordId);

		this.throwIfNotCollaboraEditable(fileRecord);

		const response = WopiFileInfoResponseFactory.buildFromFileRecordAndUser(
			fileRecord,
			{
				id: userId,
				userName: userDisplayName,
				canWrite,
			},
			this.wopiConfig.WOPI_POST_MESSAGE_ORIGIN
		);

		return response;
	}

	public async getFileStream(params: SingleFileParams, wopiToken: WopiAccessTokenParams): Promise<GetFileResponse> {
		const { fileRecordId } = await this.getWopiPayload(params, wopiToken);
		const fileRecord = await this.filesStorageService.getFileRecord(fileRecordId);

		this.throwIfNotCollaboraEditable(fileRecord);

		const fileResponse = await this.filesStorageService.downloadFile(fileRecord);

		return fileResponse;
	}

	private getCollaboraEditabilityStatus(fileRecord: FileRecord): CollaboraEditabilityStatus {
		const isCollaboraEditable = fileRecord.isCollaboraEditable(this.wopiConfig.COLLABORA_MAX_FILE_SIZE_IN_BYTES);
		const exceedsCollaboraEditableFileSize = fileRecord.exceedsCollaboraEditableFileSize(
			this.wopiConfig.COLLABORA_MAX_FILE_SIZE_IN_BYTES
		);
		const status = {
			isCollaboraEditable,
			exceedsCollaboraEditableFileSize,
		};

		return status;
	}

	private throwIfNotCollaboraEditable(fileRecord: FileRecord): void {
		const status = this.getCollaboraEditabilityStatus(fileRecord);

		if (!status.isCollaboraEditable) {
			throw new NotFoundException(
				'File blocked due to suspected virus, mimetype not collabora compatible or file size exceeds limit'
			);
		}
	}

	private async getWopiPayload(params: SingleFileParams, wopiToken: WopiAccessTokenParams): Promise<WopiPayload> {
		const result = await this.authorizationClientAdapter.resolveToken(
			wopiToken.access_token,
			this.wopiConfig.WOPI_TOKEN_TTL_IN_SECONDS
		);
		const payload = WopiPayloadFactory.buildFromUnknownObject(result.payload);

		return payload;
	}

	private async checkPermissionAndCreateAccessToken(
		parentType: FileRecordParentType,
		referenceId: EntityId,
		editorMode: EditorMode,
		payload: WopiPayload
	): Promise<WopiAccessToken> {
		const referenceType = FilesStorageMapper.mapToAllowedAuthorizationEntityType(parentType);
		const authorizationContext = this.authorizationContext(editorMode);

		const response = await this.authorizationClientAdapter.createToken({
			referenceType,
			referenceId,
			context: authorizationContext,
			payload,
			tokenTtlInSeconds: this.wopiConfig.WOPI_TOKEN_TTL_IN_SECONDS,
		});

		const wopiAccessToken = WopiAccessTokenFactory.buildFromString(response.token);

		return wopiAccessToken;
	}

	private authorizationContext(editorMode: EditorMode): AuthorizationContextParams {
		let context: AuthorizationContextParams;
		if (editorMode === EditorMode.EDIT) {
			context = AuthorizationContextBuilder.write([AuthorizationContextParamsRequiredPermissions.FILESTORAGE_EDIT]);
		} else {
			context = AuthorizationContextBuilder.read([AuthorizationContextParamsRequiredPermissions.FILESTORAGE_VIEW]);
		}

		return context;
	}
}
