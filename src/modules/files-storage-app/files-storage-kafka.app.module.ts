import { CoreModule } from '@infra/core';
import { DatabaseModule } from '@infra/database';
import { KafkaModule } from '@infra/kafka';
import { LoggerModule } from '@infra/logger';
import { FilesStorageModule } from '@modules/files-storage';
import { KafkaConsumer } from '@modules/files-storage/api/kafka';
import { ENTITIES } from '@modules/files-storage/files-storage.entity.imports';
import { Module } from '@nestjs/common';
import { RequestTimeoutConfig } from './files-storage-app.config';

@Module({
	imports: [
		FilesStorageModule,
		CoreModule.register(RequestTimeoutConfig),
		LoggerModule,
		DatabaseModule.forRoot(ENTITIES),
		KafkaModule,
	],
	controllers: [KafkaConsumer],
})
export class FilesStorageKafkaModule {}
