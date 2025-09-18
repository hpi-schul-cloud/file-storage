import { ConfigurationModule } from '@infra/configuration/configuration.module';
import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { FilesStorageApiModule, FileStorageConfig } from '@modules/files-storage';
import { WopiApiModule, WopiConfig } from '@modules/wopi';
import { Module } from '@nestjs/common';
import { FilesStorageConfigController, FilesStorageConfigUC } from './api';
import { RequestTimeoutConfig } from './files-storage-app.config';
import { ENTITIES } from './files-storage.entity.imports';

export const imports = [
	WopiApiModule,
	FilesStorageApiModule,
	CoreModule.register(RequestTimeoutConfig),
	ConfigurationModule.register(FileStorageConfig),
	ConfigurationModule.register(WopiConfig),
];
export const providers = [FilesStorageConfigUC];
export const controllers = [FilesStorageConfigController];

@Module({
	imports: [...imports, DatabaseModule.forRoot(ENTITIES)],
	controllers,
	providers,
})
export class FilesStorageAppModule {}
