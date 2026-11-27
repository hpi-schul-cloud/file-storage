import { ConfigurationModule } from '@infra/configuration';
import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { FilesStorageApiModule } from '@modules/files-storage';
import { ENTITIES } from '@modules/files-storage/files-storage.entity.imports';
import { WopiApiModule } from '@modules/wopi';
import { Module } from '@nestjs/common';
import { FilesStorageConfigController, FilesStorageConfigUc } from './api';
import {
	FILES_STORAGE_APP_PUBLIC_ORIGIN_CONFIG_TOKEN,
	FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN,
	PublicOriginConfig,
	RequestTimeoutConfig,
} from './files-storage-app.config';

export const imports = [
	WopiApiModule,
	FilesStorageApiModule,
	CoreModule.register(FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN, RequestTimeoutConfig),
	ConfigurationModule.register(FILES_STORAGE_APP_PUBLIC_ORIGIN_CONFIG_TOKEN, PublicOriginConfig),
];
export const providers = [FilesStorageConfigUc];
export const controllers = [FilesStorageConfigController];

@Module({
	imports: [...imports, DatabaseModule.forRoot(ENTITIES)],
	controllers,
	providers,
})
export class FilesStorageAppModule {}
