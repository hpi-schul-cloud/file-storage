import {
	AuthorizationClientAdapter,
	AuthorizationContextBuilder,
	AuthorizationContextParams,
	AuthorizationContextParamsRequiredPermissions,
} from '@infra/authorization-client';
import { CollaboraService } from '@infra/collabora';
import { Logger } from '@infra/logger';
import { Injectable } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { FileRecordParentType, GetFileResponse } from '../../domain';
import { FileRecord } from '../../domain/file-record.do';
import { FilesStorageService } from '../../domain/service/files-storage.service';
import { WopiConfig } from '../../wopi.config';
import { SingleFileParams } from '../dto';
import { WopiCheckFileInfoResponse } from '../dto/wopi.response';
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

	public async discoveryEditorUrl(fileRecordId: string, jwt: string): Promise<string> {
		const fileRecord = await this.filesStorageService.getFileRecord(fileRecordId);
		const { mimeType } = fileRecord;
		const { WOPI_URL } = this.wopiConfig;

		const collaboraUrl = await this.collaboraService.getDiscoveryUrl(mimeType);

		const url = `${collaboraUrl}WOPISrc=${WOPI_URL}/${fileRecordId}&access_token=${jwt}`;

		return url;
	}

	public async checkFileInfo(params: SingleFileParams, userId: string): Promise<WopiCheckFileInfoResponse> {
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(params.fileRecordId);
		const { parentId, parentType } = fileRecord.getProps();

		const canWrite = await this.hasPermission(
			parentType,
			parentId,
			AuthorizationContextBuilder.write([AuthorizationContextParamsRequiredPermissions.FILESTORAGE_EDIT]) // @TODO what permissions should be used here?
		);

		const response = WopiResponseBuilder.buildCheckFileInfo(fileRecord, {
			id: userId,
			userName: 'User Name', //@TODO call user service to get user name
			canWrite,
		});

		return response;
	}

	public async getFileStream(params: SingleFileParams): Promise<GetFileResponse> {
		const fileRecord = await this.filesStorageService.getFileRecord(params.fileRecordId);
		const fileResponse = await this.filesStorageService.downloadFile(fileRecord);

		return fileResponse;
	}

	private async hasPermission(
		parentType: FileRecordParentType,
		parentId: EntityId,
		context: AuthorizationContextParams
	): Promise<boolean> {
		const referenceType = FilesStorageMapper.mapToAllowedAuthorizationEntityType(parentType);

		const result = await this.authorizationClientAdapter.hasPermissionsByReference(referenceType, parentId, context);

		return result;
	}
}
