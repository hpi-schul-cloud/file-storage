import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { FilesStorageApiModule } from '@modules/files-storage';
import { WopiApiModule } from '@modules/wopi';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RequestTimeoutConfig } from './files-storage-app.config';
import { ENTITIES } from './files-storage.entity.imports';

export const filesStorageAppImports = [
	WopiApiModule,
	FilesStorageApiModule,
	HttpModule,
	CoreModule.register(RequestTimeoutConfig),
];

@Module({
	imports: [...filesStorageAppImports, DatabaseModule.forRoot(ENTITIES)],
	controllers: [],
	providers: [],
})
export class FilesStorageAppModule {}
