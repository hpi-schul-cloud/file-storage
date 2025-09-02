import { ConfigurationModule } from '@infra/configuration';
import { CoreModule } from '@infra/core';
import { PreviewGeneratorConsumerModule } from '@infra/preview-generator';
import { FILE_STORAGE_CLIENT } from '@infra/preview-generator/preview-generator.service';
import { S3ClientModule } from '@infra/s3-client';
import { Module } from '@nestjs/common';
// TODO: Import
import { createS3ModuleOptions } from '../files-storage/files-storage.config';
import { FilesPreviewAppConfig, RequestTimeoutConfig } from './files-preview-app.config';

@Module({
	imports: [
		PreviewGeneratorConsumerModule.registerAsync({
			imports: [
				CoreModule.register(RequestTimeoutConfig),
				S3ClientModule.registerAsync({
					injectionToken: FILE_STORAGE_CLIENT,
					useFactory: createS3ModuleOptions, // TODO: connectionName: FILES_STORAGE_S3_CONNECTION, sieht nicht richtig aus, sollte FILE_STORAGE_CLIENT sein
					inject: [FilesPreviewAppConfig],
					imports: [ConfigurationModule.register(FilesPreviewAppConfig)],
				}),
			],
		}),
	],
})
export class PreviewGeneratorAMQPModule {}
