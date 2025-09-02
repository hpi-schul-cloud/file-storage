import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { LoggerModule } from '@infra/logger';
import { RabbitMQWrapperModule } from '@infra/rabbitmq';
import { Module } from '@nestjs/common';
import { FilesStorageConsumer } from '../files-storage/api';
import { FilesStorageExchange } from '../files-storage/api/amqp';
import { FilesStorageModule } from '../files-storage/files-storage.module';
import { RequestTimeoutConfig } from './files-storage-app.config';
import { ENTITIES } from './files-storage.entity.imports';

@Module({
	imports: [
		FilesStorageModule,
		CoreModule.register(RequestTimeoutConfig),
		LoggerModule,
		DatabaseModule.forRoot(ENTITIES),
		RabbitMQWrapperModule.forRoot([FilesStorageExchange]),
	],
	providers: [FilesStorageConsumer],
})
export class FilesStorageAMQPModule {}
