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

@Module({
	imports: [
		PreviewGeneratorConsumerModule.registerAsync({
			imports: [
				CoreModule.register(FILES_PREVIEW_APP_REQUEST_TIMEOUT_CONFIG_TOKEN, RequestTimeoutConfig),
				S3ClientModule.register({
					clientInjectionToken: FILE_STORAGE_CLIENT,
					configInjectionToken: FILES_PREVIEW_APP_CONFIG_TOKEN,
					configConstructor: FilesPreviewAppConfig,
				}),
			],
		}),
	],
})
export class PreviewGeneratorAMQPModule {}
