import { ConfigurationModule } from '@infra/configuration';
import { CoreModule } from '@infra/core';
import { PreviewGeneratorConsumerModule } from '@infra/preview-generator';
import { FILE_STORAGE_CLIENT } from '@infra/preview-generator/preview-generator.service';
import { S3ClientModule } from '@infra/s3-client';
import { Module } from '@nestjs/common';
// TODO: Import Cycle
import { createS3ModuleOptions } from '@modules/files-storage/files-storage.config';
import { FilesPreviewAppConfig, RequestTimeoutConfig } from './files-preview-app.config';

@Module({
	imports: [
		PreviewGeneratorConsumerModule.registerAsync({
			imports: [
				CoreModule.register(RequestTimeoutConfig),
				S3ClientModule.registerAsync({
					injectionToken: FILE_STORAGE_CLIENT,
					useFactory: createS3ModuleOptions,
					inject: [FilesPreviewAppConfig],
					imports: [ConfigurationModule.register(FilesPreviewAppConfig)],
				}),
			],
		}),
	],
})
export class PreviewGeneratorAMQPModule {}
