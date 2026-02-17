import { ConfigurationModule } from '@infra/configuration';
import { CoreModule } from '@infra/core';
import { PreviewGeneratorConsumerModule } from '@infra/preview-generator';
import { FILE_STORAGE_CLIENT } from '@infra/preview-generator/preview-generator.service';
import { S3ClientModule } from '@infra/s3-client';
import { Module } from '@nestjs/common';
import {
	FILES_PREVIEW_APP_CONFIG_TOKEN,
	FILES_PREVIEW_APP_REQUEST_TIMEOUT_CONFIG_TOKEN,
	FilesPreviewAppConfig,
	RequestTimeoutConfig,
} from './files-preview-app.config';
// TODO: Import Cycle
import { createS3ModuleOptions } from '@modules/files-storage/files-storage.config';

@Module({
	imports: [
		PreviewGeneratorConsumerModule.registerAsync({
			imports: [
				CoreModule.register(FILES_PREVIEW_APP_REQUEST_TIMEOUT_CONFIG_TOKEN, RequestTimeoutConfig),
				S3ClientModule.registerAsync({
					injectionToken: FILE_STORAGE_CLIENT,
					useFactory: createS3ModuleOptions,
					inject: [FILES_PREVIEW_APP_CONFIG_TOKEN],
					imports: [ConfigurationModule.register(FILES_PREVIEW_APP_CONFIG_TOKEN, FilesPreviewAppConfig)],
				}),
			],
		}),
	],
})
export class PreviewGeneratorAMQPModule {}
