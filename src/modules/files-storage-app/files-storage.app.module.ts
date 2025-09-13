import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { FilesStorageApiModule } from '@modules/files-storage';
import { WopiApiModule } from '@modules/wopi';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FilesStorageConfigController, FilesStorageConfigUC } from './api';
import { RequestTimeoutConfig } from './files-storage-app.config';
import { ENTITIES } from './files-storage.entity.imports';

export const imports = [WopiApiModule, FilesStorageApiModule, HttpModule, CoreModule.register(RequestTimeoutConfig)];
export const providers = [FilesStorageConfigUC];
export const controllers = [FilesStorageConfigController];

@Module({
	imports: [...imports, DatabaseModule.forRoot(ENTITIES)],
	controllers,
	providers,
})
export class FilesStorageAppModule {}
