import {
	AuthorizationClientAdapter,
	AuthorizationContextBuilder,
	AuthorizationContextParams,
	AuthorizationContextParamsRequiredPermissions,
} from '@infra/authorization-client';
import { CollaboraService } from '@infra/collabora';
import { Logger } from '@infra/logger';
import { FilesStorageMapper } from '@modules/files-storage/api/mapper'; // TODO: puhh darüber muss man noch mal nachdenken
import { FileRecord, FileRecordParentType, FilesStorageService, GetFileResponse } from '@modules/files-storage/domain'; // TODO export location und GetFileResponse?
import { Injectable } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { Request } from 'express';
import {
	AuthorizedCollaboraDocumentUrlFactory,
	WopiAccessToken,
	WopiAccessTokenFactory,
	WopiPayload,
	WopiPayloadFactory,
} from '../domain';
import { WopiService } from '../domain/wopi.service';
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
		private readonly wopiService: WopiService
	) {
		this.logger.setContext(WopiUc.name);
	}

	public async putFile(query: WopiAccessTokenParams, req: Request): Promise<FileRecord> {
		this.wopiService.ensureWopiEnabled();

		const result = await this.authorizationClientAdapter.resolveToken(
			query.access_token,
			this.wopiService.getTokenTtlInSeconds()
		);

		const payload = WopiPayloadFactory.buildFromUnknownObject(result.payload);
		const fileRecord = await this.filesStorageService.getFileRecord(payload.fileRecordId);

		this.wopiService.checkCollaboraCompatibilityMimetype(fileRecord);

		const updatedFileRecord = await this.filesStorageService.updateFileContents(fileRecord, req);

		return updatedFileRecord;
	}

	public async getAuthorizedCollaboraDocumentUrl(
		userId: EntityId,
		params: AuthorizedCollaboraDocumentUrlParams
	): Promise<AuthorizedCollaboraDocumentUrlResponse> {
		this.wopiService.ensureWopiEnabled();

		const { fileRecordId, userDisplayName, editorMode } = params;
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(fileRecordId);
		const { parentId, parentType } = fileRecord.getProps();

		this.wopiService.throwIfNotCollaboraEditable(fileRecord);

		const canWrite = editorMode === EditorMode.EDIT;
		const payload = WopiPayloadFactory.buildFromParams(fileRecord.id, canWrite, userDisplayName, userId);

		const accessToken = await this.checkPermissionAndCreateAccessToken(parentType, parentId, editorMode, payload);
		const collaboraUrl = await this.collaboraService.discoverUrl(fileRecord.mimeType);
		const wopiUrl = this.wopiService.getWopiUrl();

		const url = AuthorizedCollaboraDocumentUrlFactory.buildFromParams(
			collaboraUrl,
			wopiUrl,
			fileRecord.id,
			accessToken
		);
		const response = AuthorizedCollaboraDocumentUrlResponseFactory.buildFromAuthorizedCollaboraDocumentUrl(url);

		return response;
	}

	public async checkFileInfo(wopiToken: WopiAccessTokenParams): Promise<WopiFileInfoResponse> {
		this.wopiService.ensureWopiEnabled();

		const { fileRecordId, userId, userDisplayName, canWrite } = await this.getWopiPayload(wopiToken);
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(fileRecordId);

		this.wopiService.throwIfNotCollaboraEditable(fileRecord);
		const postMessageOrigin = this.wopiService.getPostMessageOrigin();

		const response = WopiFileInfoResponseFactory.buildFromFileRecordAndUser(
			fileRecord,
			{
				id: userId,
				userName: userDisplayName,
				canWrite,
			},
			postMessageOrigin
		);

		return response;
	}

	public async getFileStream(wopiToken: WopiAccessTokenParams): Promise<GetFileResponse> {
		this.wopiService.ensureWopiEnabled();

		const { fileRecordId } = await this.getWopiPayload(wopiToken);
		const fileRecord = await this.filesStorageService.getFileRecord(fileRecordId);

		this.wopiService.throwIfNotCollaboraEditable(fileRecord);

		const fileResponse = await this.filesStorageService.downloadFile(fileRecord);

		return fileResponse;
	}

	private async getWopiPayload(wopiToken: WopiAccessTokenParams): Promise<WopiPayload> {
		const result = await this.authorizationClientAdapter.resolveToken(
			wopiToken.access_token,
			this.wopiService.getTokenTtlInSeconds()
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
			tokenTtlInSeconds: this.wopiService.getTokenTtlInSeconds(),
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
