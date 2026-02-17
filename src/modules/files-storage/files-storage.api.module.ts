import { AuthGuardModule, AuthGuardOptions } from '@infra/auth-guard/auth-guard.module';
import { AuthorizationClientModule } from '@infra/authorization-client';
import { ConfigurationModule } from '@infra/configuration';
import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import {
	FileSecurityController,
	FilesStorageAdminController,
	FilesStorageAdminUC,
	FilesStorageController,
	FilesStorageUC,
} from './api';
import { FILE_STORAGE_CONFIG_TOKEN, FileStorageConfig } from './files-storage.config';
import { FilesStorageModule } from './files-storage.module';

const imports = [
	ErrorModule,
	LoggerModule,
	FilesStorageModule,
	AuthorizationClientModule.register(),
	HttpModule,
	AuthGuardModule.register([AuthGuardOptions.JWT]),
	ConfigurationModule.register(FILE_STORAGE_CONFIG_TOKEN, FileStorageConfig),
];
const providers = [FilesStorageUC, FilesStorageAdminUC];
const controllers = [FilesStorageController, FilesStorageAdminController, FileSecurityController];

@Module({
	imports,
	providers,
	controllers,
	exports: [ConfigurationModule.register(FILE_STORAGE_CONFIG_TOKEN, FileStorageConfig)],
})
export class FilesStorageApiModule {}
