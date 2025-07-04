import {
	AuthorizationClientAdapter,
	AuthorizationContextBuilder,
	AuthorizationContextParams,
	AuthorizationContextParamsRequiredPermissions,
} from '@infra/authorization-client';
import { Logger } from '@infra/logger';
import { FileRecordParentType, GetFileResponse } from '@modules/files-storage/domain';
import { Injectable } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { FileRecord } from '../../domain/file-record.do';
import { FilesStorageService } from '../../domain/service/files-storage.service';
import { SingleFileParams } from '../dto';
import { WopiCheckFileInfoResponse } from '../dto/wopi.response';
import { WopiResponseBuilder } from '../mapper';

@Injectable()
export class WopiUc {
	constructor(
		private readonly filesStorageService: FilesStorageService,
		private readonly authorizationClientAdapter: AuthorizationClientAdapter,
		private readonly logger: Logger
	) {
		this.logger.setContext(WopiUc.name);
	}

	public async checkFileInfo(params: SingleFileParams, userId: string): Promise<WopiCheckFileInfoResponse> {
		const fileRecord: FileRecord = await this.filesStorageService.getFileRecord(params.fileRecordId);
		const { parentId, parentType } = fileRecord.getProps();

		const canWrite = await this.hasPermission(
			parentType,
			parentId,
			AuthorizationContextBuilder.write([AuthorizationContextParamsRequiredPermissions.BOARD_EDIT]) // @TODO what permissions should be used here?
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
		//@TODO fix JWT authentication problem
		/*const referenceType = FilesStorageMapper.mapToAllowedAuthorizationEntityType(parentType);

		const result = await this.authorizationClientAdapter.hasPermissionsByReference(referenceType, parentId, context);

		return result;*/
		return true;
	}
}
