import {
	AccessToken,
	AuthorizationClientAdapter,
	AuthorizationContextBuilder,
	AuthorizationContextParams,
	AuthorizationContextParamsRequiredPermissions,
} from '@infra/authorization-client';
import { CollaboraService } from '@infra/collabora';
import { Logger } from '@infra/logger';
import { FileRecord, FilesStorageMapper, GetFileResponse } from '@modules/files-storage';
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { Request } from 'express';
import { AuthorizedCollaboraDocumentUrlFactory, WopiPayload, WopiPayloadFactory, WopiService } from '../domain';
import { WopiConfig } from '../wopi.config';
import {
	AuthorizedCollaboraDocumentUrlParams,
	AuthorizedCollaboraDocumentUrlResponse,
	EditorMode,
	WopiAccessTokenParams,
	WopiFileInfoResponse,
} from './dto';
import { AuthorizedCollaboraDocumentUrlResponseFactory, WopiFileInfoResponseFactory, WopiUserFactory } from './factory';

@Injectable()
export class WopiUc {
	constructor(
		private readonly authorizationClientAdapter: AuthorizationClientAdapter,
		private readonly logger: Logger,
		private readonly collaboraService: CollaboraService,
		private readonly wopiService: WopiService,
		private readonly config: WopiConfig
	) {
		this.logger.setContext(WopiUc.name);
	}

	public async putFile(wopiToken: WopiAccessTokenParams, req: Request): Promise<FileRecord> {
		this.ensureWopiEnabled();

		const wopiPayload = await this.resolveWopiPayloadByToken(wopiToken);
		const updatedFileRecord = await this.wopiService.updateFileContents(wopiPayload.fileRecordId, req);

		return updatedFileRecord;
	}

	public async getAuthorizedCollaboraDocumentUrl(
		userId: EntityId,
		params: AuthorizedCollaboraDocumentUrlParams
	): Promise<AuthorizedCollaboraDocumentUrlResponse> {
		this.ensureWopiEnabled();

		const fileRecord = await this.wopiService.getFileRecord(params.fileRecordId);

		const payload = this.buildWopiPayload(userId, params);
		const accessToken = await this.checkPermissionAndCreateAccessToken(fileRecord, params, payload);
		const collaboraUrl = await this.collaboraService.discoverUrl(fileRecord.mimeType);
		const wopiUrl = this.config.WOPI_URL;

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
		this.ensureWopiEnabled();

		const wopiPayload = await this.resolveWopiPayloadByToken(wopiToken);
		const fileRecord = await this.wopiService.getFileRecord(wopiPayload.fileRecordId);

		const wopiUser = WopiUserFactory.build(wopiPayload);
		const response = WopiFileInfoResponseFactory.buildFromFileRecordAndUser(
			fileRecord,
			wopiUser,
			this.config.WOPI_POST_MESSAGE_ORIGIN
		);

		return response;
	}

	public async getFileStream(wopiToken: WopiAccessTokenParams): Promise<GetFileResponse> {
		this.ensureWopiEnabled();

		const wopiPayload = await this.resolveWopiPayloadByToken(wopiToken);
		const fileResponse = await this.wopiService.getFile(wopiPayload.fileRecordId);

		return fileResponse;
	}

	private buildWopiPayload(userId: EntityId, params: AuthorizedCollaboraDocumentUrlParams): WopiPayload {
		const { fileRecordId, userDisplayName, editorMode } = params;
		const canWrite = editorMode === EditorMode.EDIT;
		const payload = WopiPayloadFactory.buildFromParams(fileRecordId, canWrite, userDisplayName, userId);

		return payload;
	}

	private async resolveWopiPayloadByToken(wopiToken: WopiAccessTokenParams): Promise<WopiPayload> {
		const result = await this.authorizationClientAdapter.resolveToken(
			wopiToken.access_token,
			this.config.WOPI_TOKEN_TTL_IN_SECONDS
		);
		const payload = WopiPayloadFactory.buildFromUnknownObject(result.payload);

		return payload;
	}

	private async checkPermissionAndCreateAccessToken(
		fileRecord: FileRecord,
		params: AuthorizedCollaboraDocumentUrlParams,
		payload: WopiPayload
	): Promise<AccessToken> {
		const { parentId, parentType } = fileRecord.getParentInfo();
		const referenceType = FilesStorageMapper.mapToAllowedAuthorizationEntityType(parentType);
		const authorizationContext = this.authorizationContext(params.editorMode);

		const accessToken = await this.authorizationClientAdapter.createToken({
			referenceType,
			referenceId: parentId,
			context: authorizationContext,
			payload,
			tokenTtlInSeconds: this.config.WOPI_TOKEN_TTL_IN_SECONDS,
		});

		return accessToken;
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

	public ensureWopiEnabled(): void {
		if (!this.config.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED) {
			throw new NotFoundException('WOPI feature is disabled.');
		}
	}
}
