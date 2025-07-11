import {
	AuthorizationClientAdapter,
	AuthorizationContextBuilder,
	AuthorizationContextParams,
	AuthorizationContextParamsRequiredPermissions,
} from '@infra/authorization-client';
import { Logger } from '@infra/logger';
import { Injectable } from '@nestjs/common';
import { EntityId } from '@shared/domain/types';
import { FilesStorageService, StorageLocation } from '../../domain';
import { StorageLocationParamsDto } from '../dto';
import { FilesStorageMapper } from '../mapper';

@Injectable()
export class FilesStorageAdminUC {
	constructor(
		private readonly filesStorageAdminService: FilesStorageService,
		private readonly logger: Logger,
		private readonly authorizationClientAdapter: AuthorizationClientAdapter
	) {
		this.logger.setContext(FilesStorageAdminUC.name);
	}

	public async deleteByStorageLocation(params: StorageLocationParamsDto): Promise<number> {
		const contextForAllowOnlyInstanceOperation = AuthorizationContextBuilder.write([
			AuthorizationContextParamsRequiredPermissions.CAN_EXECUTE_INSTANCE_OPERATIONS,
			AuthorizationContextParamsRequiredPermissions.FILESTORAGE_REMOVE,
		]);

		await this.checkPermission(params.storageLocation, params.storageLocationId, contextForAllowOnlyInstanceOperation);
		const result = await this.filesStorageAdminService.markForDeleteByStorageLocation(params);

		return result;
	}

	private async checkPermission(
		storageLocation: StorageLocation,
		storageLocationId: EntityId,
		context: AuthorizationContextParams
	): Promise<void> {
		const referenceType = FilesStorageMapper.mapToAllowedStorageLocationType(storageLocation);

		await this.authorizationClientAdapter.checkPermissionsByReference(referenceType, storageLocationId, context);
	}
}
