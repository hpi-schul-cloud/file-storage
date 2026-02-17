import { ConfigurationModule } from '@infra/configuration/configuration.module';
import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { FILE_STORAGE_CONFIG_TOKEN, FilesStorageApiModule, FileStorageConfig } from '@modules/files-storage';
import { ENTITIES } from '@modules/files-storage/files-storage.entity.imports';
import { WOPI_PUBLIC_API_CONFIG_TOKEN, WopiApiModule, WopiPublicApiConfig } from '@modules/wopi';
import { Module } from '@nestjs/common';
import { FilesStorageConfigController, FilesStorageConfigUc } from './api';
import { FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN, RequestTimeoutConfig } from './files-storage-app.config';

export const imports = [
	WopiApiModule,
	FilesStorageApiModule,
	CoreModule.register(FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN, RequestTimeoutConfig),
	ConfigurationModule.register(FILE_STORAGE_CONFIG_TOKEN, FileStorageConfig),
	ConfigurationModule.register(WOPI_PUBLIC_API_CONFIG_TOKEN, WopiPublicApiConfig),
];
export const providers = [FilesStorageConfigUc];
export const controllers = [FilesStorageConfigController];

@Module({
	imports: [...imports, DatabaseModule.forRoot(ENTITIES)],
	controllers,
	providers,
})
export class FilesStorageAppModule {}
