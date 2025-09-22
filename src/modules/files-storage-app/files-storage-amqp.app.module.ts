import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { LoggerModule } from '@infra/logger';
import { RabbitMQWrapperModule } from '@infra/rabbitmq';
import { FilesStorageConsumer, FilesStorageExchange, FilesStorageModule } from '@modules/files-storage';
import { Module } from '@nestjs/common';
import { ENTITIES } from '../files-storage/files-storage.entity.imports';
import { RequestTimeoutConfig } from './files-storage-app.config';

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
