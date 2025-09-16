import { AuthGuardModule, AuthGuardOptions } from '@infra/auth-guard/auth-guard.module';
import { AuthorizationClientModule } from '@infra/authorization-client';
import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FilesStorageAdminController, FilesStorageAdminUC, FilesStorageController, FilesStorageUC } from './api';
import { FilesStorageModule } from './files-storage.module';

const imports = [
	ErrorModule,
	LoggerModule,
	FilesStorageModule,
	AuthorizationClientModule.register(),
	HttpModule,
	AuthGuardModule.register([AuthGuardOptions.JWT]),
];
const providers = [FilesStorageUC, FilesStorageAdminUC];
const controllers = [FilesStorageController, FilesStorageAdminController];

@Module({
	imports,
	providers,
	controllers,
	exports: [],
})
export class FilesStorageApiModule {}
