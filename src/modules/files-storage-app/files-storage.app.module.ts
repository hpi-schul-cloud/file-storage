import { ConfigurationModule } from '@infra/configuration/configuration.module';
import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { FilesStorageApiModule, FileStorageConfig } from '@modules/files-storage';
import { ENTITIES } from '@modules/files-storage/files-storage.entity.imports';
import { WopiApiModule, WopiPublicApiConfig } from '@modules/wopi';
import { Module } from '@nestjs/common';
import { FilesStorageConfigController, FilesStorageConfigUc } from './api';
import { RequestTimeoutConfig } from './files-storage-app.config';

export const imports = [
	WopiApiModule,
	FilesStorageApiModule,
	CoreModule.register(RequestTimeoutConfig),
	ConfigurationModule.register(FileStorageConfig),
	ConfigurationModule.register(WopiPublicApiConfig),
];
export const providers = [FilesStorageConfigUc];
export const controllers = [FilesStorageConfigController];

@Module({
	imports: [...imports, DatabaseModule.forRoot(ENTITIES)],
	controllers,
	providers,
})
export class FilesStorageAppModule {}
