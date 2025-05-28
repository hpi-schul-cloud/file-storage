import { ConfigurationModule } from '@infra/configuration';
import { CoreModule } from '@infra/core';
import { PreviewGeneratorConsumerModule } from '@infra/preview-generator';
import { FILE_STORAGE_CLIENT } from '@infra/preview-generator/preview-generator.service';
import { S3ClientModule } from '@infra/s3-client';
import { Module } from '@nestjs/common';
import { createS3ModuleOptions, FileStorageConfig, RequestTimeoutConfig } from './files-storage.config';

@Module({
	imports: [
		PreviewGeneratorConsumerModule.registerAsync({
			imports: [
				CoreModule.register(RequestTimeoutConfig),
				S3ClientModule.registerAsync({
					injectionToken: FILE_STORAGE_CLIENT,
					useFactory: createS3ModuleOptions,
					inject: [FileStorageConfig],
					imports: [ConfigurationModule.register(FileStorageConfig)],
				}),
			],
		}),
	],
})
export class PreviewGeneratorAMQPModule {}
