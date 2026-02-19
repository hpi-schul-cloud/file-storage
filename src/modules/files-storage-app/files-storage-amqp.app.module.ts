import { ConfigurationModule } from '@infra/configuration';
import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { LOGGER_CONFIG_TOKEN, LoggerConfig, LoggerModule } from '@infra/logger';
import { RabbitMQWrapperModule } from '@infra/rabbitmq';
import { FilesStorageConsumer, FilesStorageExchange, FilesStorageModule } from '@modules/files-storage';
import { ENTITIES } from '@modules/files-storage/files-storage.entity.imports';
import { Module } from '@nestjs/common';
import { FILES_STORAGE_AMQP_APP_REQUEST_TIMEOUT_CONFIG_TOKEN, RequestTimeoutConfig } from './files-storage-app.config';

@Module({
	imports: [
		FilesStorageModule,
		CoreModule.register(FILES_STORAGE_AMQP_APP_REQUEST_TIMEOUT_CONFIG_TOKEN, RequestTimeoutConfig),
		LoggerModule,
		DatabaseModule.forRoot(ENTITIES),
		RabbitMQWrapperModule.forRoot([FilesStorageExchange]),
		ConfigurationModule.register(LOGGER_CONFIG_TOKEN, LoggerConfig),
	],
	providers: [FilesStorageConsumer],
})
export class FilesStorageAMQPModule {}
