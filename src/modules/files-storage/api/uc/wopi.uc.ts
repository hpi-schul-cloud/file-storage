import {
	AuthorizationClientAdapter,
	AuthorizationContextBuilder,
	AuthorizationContextParams,
	AuthorizationContextParamsRequiredPermissions,
} from '@infra/authorization-client';
import { CollaboraService } from '@infra/collabora';
import { Logger } from '@infra/logger';
import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { Request } from 'express';
import {
	AccessUrlFactory,
	FileInfoFactory,
	FileRecord,
	FileRecordParentType,
	FilesStorageService,
	GetFileResponse,
	WopiAccessToken,
	WopiPayload,
	WopiPayloadFactory,
} from '../../domain';
import { WopiConfig } from '../../wopi.config';
import {
	AccessUrlResponse,
	DiscoveryAccessUrlParams,
	EditorMode,
	SingleFileParams,
	WopiAccessTokenParams,
	WopiCheckFileInfoResponse,
} from '../dto';
import { AccessUrlResponseFactory, WopiCheckFileInfoResponseFactory } from '../factory';
import { FileDtoBuilder, FilesStorageMapper } from '../mapper';

@Injectable()
export class WopiUc {
	constructor(
		private readonly filesStorageService: FilesStorageService,
		private readonly authorizationClientAdapter: AuthorizationClientAdapter,
		private readonly logger: Logger,
		private readonly collaboraService: CollaboraService,
		private readonly wopiConfig: WopiConfig,
		private readonly em: EntityManager
	) {
		this.logger.setContext(WopiUc.name);
	}

	public async putFile(query: WopiAccessTokenParams, req: Request): Promise<FileRecord> {
		const result = await this.authorizationClientAdapter.resolveToken(
			query.access_token,
			this.wopiConfig.WOPI_TOKEN_TTL_IN_SECONDS
		);

		const payload = WopiPayloadFactory.buildFromUnknownObject(result.payload);

		const fileRecord = await this.uploadFile(payload.fileRecordId, req);

		return fileRecord;
	}

	private async uploadFile(fileRecordId: EntityId, req: Request): Promise<FileRecord> {
		const fileRecord = await this.filesStorageService.getFileRecord(fileRecordId);
		const fileInfo = FileInfoFactory.buildFromParams(fileRecord.getName(), fileRecord.mimeType);
		const fileDto = FileDtoBuilder.buildFromRequest(fileInfo, req);

		return RequestContext.create(this.em, () => {
			return this.filesStorageService.updateFileContents(fileRecordId, fileDto);
		});
	}

	public async getAuthorizedCollaboraAccessUrl(
		userId: EntityId,
		params: DiscoveryAccessUrlParams
	): Promise<AccessUrlResponse> {
		const { fileRecordId, userDisplayName, editorMode } = params;
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(fileRecordId);
		const { parentId, parentType } = fileRecord.getProps();

		const canWrite = editorMode === EditorMode.EDIT;
		const payload = WopiPayloadFactory.buildFromParams(fileRecord.id, canWrite, userDisplayName, userId);

		const accessToken = await this.checkPermissionAndCreateAccessToken(parentType, parentId, editorMode, payload);
		const collaboraUrl = await this.collaboraService.discoverUrl(fileRecord.mimeType);

		const url = AccessUrlFactory.buildFromParams(collaboraUrl, this.wopiConfig.WOPI_URL, fileRecord.id, accessToken);
		const response = AccessUrlResponseFactory.buildFromAccessUrl(url);

		return response;
	}

	public async checkFileInfo(
		params: SingleFileParams,
		wopiToken: WopiAccessTokenParams
	): Promise<WopiCheckFileInfoResponse> {
		const { fileRecordId, userId, userDisplayName, canWrite } = await this.getWopiPayload(params, wopiToken);
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(fileRecordId);

		const response = WopiCheckFileInfoResponseFactory.buildFromFileRecordAndUser(fileRecord, {
			id: userId,
			userName: userDisplayName,
			canWrite,
		});

		return response;
	}

	public async getFileStream(params: SingleFileParams, wopiToken: WopiAccessTokenParams): Promise<GetFileResponse> {
		const { fileRecordId } = await this.getWopiPayload(params, wopiToken);
		const fileRecord = await this.filesStorageService.getFileRecord(fileRecordId);

		const fileResponse = await this.filesStorageService.downloadFile(fileRecord);

		return fileResponse;
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

		return response;
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
