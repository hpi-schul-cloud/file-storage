import {
	AuthorizationClientAdapter,
	AuthorizationContextBuilder,
	AuthorizationContextParams,
	AuthorizationContextParamsRequiredPermissions,
} from '@infra/authorization-client';
import { CollaboraService } from '@infra/collabora';
import { Logger } from '@infra/logger';
import { WopiBuilder } from '@modules/files-storage/domain/mapper/wopi.builder';
import { WoipAccessToken } from '@modules/files-storage/domain/wopi-access-token.vo';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { FileRecord, FileRecordParentType, FilesStorageService, GetFileResponse } from '../../domain';
import { WopiPayload } from '../../domain/wopi-payload.vo';
import { WopiConfig } from '../../wopi.config';
import {
	AccessUrlResponse,
	DiscoveryAccessUrlParams,
	EditorMode,
	SingleFileParams,
	WopiAccessTokenParams,
	WopiCheckFileInfoResponse,
} from '../dto';
import { FilesStorageMapper, WopiResponseBuilder } from '../mapper';

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

	public async discoveryAccessUrl(userId: EntityId, params: DiscoveryAccessUrlParams): Promise<AccessUrlResponse> {
		const { fileRecordId, userDisplayName, editorMode } = params;
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(fileRecordId);
		const { parentId, parentType } = fileRecord.getProps();

		const canWrite = editorMode === EditorMode.EDIT;
		const payload = WopiBuilder.buildWopiPayload(fileRecord.id, canWrite, userDisplayName, userId);

		const accessToken = await this.checkPermissionAndCreateAccessToken(parentType, parentId, editorMode, payload);
		const collaboraUrl = await this.collaboraService.getDiscoveryUrl(fileRecord.mimeType);

		const url = WopiBuilder.buildAccessUrl(collaboraUrl, this.wopiConfig.WOPI_URL, fileRecord.id, accessToken);
		const response = WopiResponseBuilder.buildAccessUrlResponse(url);

		return response;
	}

	public async checkFileInfo(
		params: SingleFileParams,
		wopiToken: WopiAccessTokenParams
	): Promise<WopiCheckFileInfoResponse> {
		const { fileRecordId, userId, userDisplayName, canWrite } = await this.getWopiPayload(params, wopiToken);
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(fileRecordId);

		const response = WopiResponseBuilder.buildCheckFileInfoResponse(fileRecord, {
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
		const result = await this.authorizationClientAdapter.resolveToken<WopiPayload>(
			wopiToken.access_token,
			this.wopiConfig.WOPI_TOKEN_TTL_IN_SECONDS
		);
		const payload = new WopiPayload(result);

		if (!payload.isSameFileRecordId(params.fileRecordId)) {
			throw new ForbiddenException('File record ID does not match the token');
		}

		return payload;
	}

	private async checkPermissionAndCreateAccessToken(
		parentType: FileRecordParentType,
		referenceId: EntityId,
		editorMode: EditorMode,
		payload: WopiPayload
	): Promise<WoipAccessToken> {
		const referenceType = FilesStorageMapper.mapToAllowedAuthorizationEntityType(parentType);
		const authorizationContext = this.authorizationContext(editorMode);

		const response = await this.authorizationClientAdapter.createToken({
			referenceType,
			referenceId,
			context: authorizationContext,
			payload,
			tokenTtl: this.wopiConfig.WOPI_TOKEN_TTL_IN_SECONDS,
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
