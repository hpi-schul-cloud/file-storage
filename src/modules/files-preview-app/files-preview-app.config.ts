import { ConfigProperty, Configuration } from '@infra/configuration';
import { TimeoutInterceptorConfig } from '@infra/core/interceptor';
import { StringToNumber } from '@shared/transformer';
import { IsNumber, IsString, IsUrl } from 'class-validator';

export const FILES_PREVIEW_APP_CONFIG_TOKEN = 'FILES_PREVIEW_APP_CONFIG_TOKEN';
export const FILES_PREVIEW_APP_REQUEST_TIMEOUT_CONFIG_TOKEN = 'FILES_PREVIEW_APP_REQUEST_TIMEOUT_CONFIG_TOKEN';

@Configuration()
export class RequestTimeoutConfig implements TimeoutInterceptorConfig {
	[key: string]: number;

	// Actually not needed in the module. Just here because TimeoutInterceptor is part of the CoreModule.
	// And CoreModule is needed because it contains error pipeline. TimeoutInterceptor should be separated from CoreModule in the future.
	@IsNumber()
	@StringToNumber()
	@ConfigProperty('CORE_INCOMING_REQUEST_TIMEOUT_MS')
	coreIncomingRequestTimeoutMs = 8000;
}

@Configuration()
export class FilesPreviewAppConfig {
	@IsUrl({ require_tld: false })
	@ConfigProperty('FILES_STORAGE_S3_ENDPOINT')
	endpoint!: string;

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_REGION')
	region = 'eu-central-1';

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_BUCKET')
	bucket!: string;

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_ACCESS_KEY_ID')
	accessKeyId!: string;

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_SECRET_ACCESS_KEY')
	secretAccessKey!: string;
}
