import { AuthGuardModule, AuthGuardOptions } from '@infra/auth-guard';
import { AuthorizationClientModule } from '@infra/authorization-client';
import { ConfigurationModule } from '@infra/configuration';
import { CoreModule } from '@infra/core';
import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { RabbitMQWrapperTestModule } from '@infra/rabbitmq';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongoMemoryDatabaseModule } from '@testing/database';
import {
	FileSecurityController,
	FilesStorageAdminController,
	FilesStorageAdminUC,
	FilesStorageConfigController,
	FilesStorageController,
	FilesStorageUC,
} from './api';
import { FileStorageConfig } from './files-storage.config';
import { TEST_ENTITIES } from './files-storage.entity.imports';
import { FilesStorageModule } from './files-storage.module';

@Module({
	imports: [
		ErrorModule,
		LoggerModule,
		FilesStorageModule,
		AuthorizationClientModule.register(),
		ConfigurationModule.register(FileStorageConfig),
		HttpModule,
		CoreModule,
		AuthGuardModule.register([AuthGuardOptions.JWT]),
		MongoMemoryDatabaseModule.forRoot(TEST_ENTITIES),
		RabbitMQWrapperTestModule,
	],
	controllers: [
		FilesStorageController,
		FilesStorageConfigController,
		FileSecurityController,
		FilesStorageAdminController,
	],
	providers: [FilesStorageUC, FilesStorageAdminUC],
})
export class FilesStorageTestModule {}
