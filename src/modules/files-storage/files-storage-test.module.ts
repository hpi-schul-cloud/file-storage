import { AuthGuardModule, AuthGuardOptions } from '@infra/auth-guard';
import { AuthorizationClientModule } from '@infra/authorization-client';
import { CollaboraModule } from '@infra/collabora';
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
	WopiController,
	WopiUc,
} from './api';
import { FileStorageConfig, RequestTimeoutConfig } from './files-storage.config';
import { TEST_ENTITIES } from './files-storage.entity.imports';
import { FilesStorageModule } from './files-storage.module';
import { WopiConfig } from './wopi.config';

@Module({
	imports: [
		ErrorModule,
		LoggerModule,
		FilesStorageModule,
		AuthorizationClientModule.register(),
		ConfigurationModule.register(FileStorageConfig),
		ConfigurationModule.register(WopiConfig),

		HttpModule,
		CoreModule.register(RequestTimeoutConfig),
		AuthGuardModule.register([AuthGuardOptions.JWT]),
		MongoMemoryDatabaseModule.forRoot(TEST_ENTITIES),
		RabbitMQWrapperTestModule,
		CollaboraModule,
	],
	controllers: [
		FilesStorageController,
		FilesStorageConfigController,
		FileSecurityController,
		FilesStorageAdminController,
		WopiController,
	],
	providers: [FilesStorageUC, FilesStorageAdminUC, WopiUc],
})
export class FilesStorageTestModule {}
