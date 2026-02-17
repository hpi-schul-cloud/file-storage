import { ConfigProperty, Configuration } from '@infra/configuration';
import { TimeoutInterceptorConfig } from '@infra/core/interceptor';
import { StringToNumber } from '@shared/transformer';
import { IsNumber, IsString, IsUrl } from 'class-validator';

export const FILES_PREVIEW_APP_CONFIG_TOKEN = 'FILES_PREVIEW_APP_CONFIG_TOKEN';
export const FILES_PREVIEW_APP_REQUEST_TIMEOUT_CONFIG_TOKEN = 'FILES_PREVIEW_APP_REQUEST_TIMEOUT_CONFIG_TOKEN';

@Configuration()
export class RequestTimeoutConfig implements TimeoutInterceptorConfig {
	[key: string]: number;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty('CORE_INCOMING_REQUEST_TIMEOUT_MS')
	coreIncomingRequestTimeoutMs!: number;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty('INCOMING_REQUEST_TIMEOUT_COPY_API_MS')
	incomingRequestTimeoutCopyApiMs!: number;
}

@Configuration()
export class FilesPreviewAppConfig {
	@IsUrl({ require_tld: false })
	@ConfigProperty('FILES_STORAGE_S3_ENDPOINT')
	filesStorageS3Endpoint = 'http://localhost:9000/';

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_REGION')
	filesStorageS3Region = 'eu-central-1';

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_BUCKET')
	filesStorageS3Bucket = 'schulcloud';

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_ACCESS_KEY_ID')
	filesStorageS3AccessKeyId = 'miniouser';

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_SECRET_ACCESS_KEY')
	filesStorageS3SecretAccessKey = 'miniouser';
}
