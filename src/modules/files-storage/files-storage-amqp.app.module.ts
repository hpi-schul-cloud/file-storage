import { ConfigurationModule } from '@infra/configuration';
import { DatabaseModule } from '@infra/database';
import { LoggerModule } from '@infra/logger';
import { RabbitMQWrapperModule } from '@infra/rabbitmq';
import { Module } from '@nestjs/common';
import { FilesStorageConsumer } from './api';
import { FilesStorageExchange } from './api/amqp';
import { FileStorageConfig } from './files-storage.config';
import { ENTITIES } from './files-storage.entity.imports';
import { FilesStorageModule } from './files-storage.module';
import { CoreModule } from '@infra/core';

@Module({
	imports: [
		ConfigurationModule.register(FileStorageConfig),
		FilesStorageModule,
		CoreModule,
		LoggerModule,
		DatabaseModule.forRoot(ENTITIES),
		RabbitMQWrapperModule.forRoot([FilesStorageExchange]),
	],
	providers: [FilesStorageConsumer],
})
export class FilesStorageAMQPModule {}
