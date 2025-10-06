import { ConfigProperty, Configuration } from '@infra/configuration';
import { TimeoutInterceptorConfig } from '@infra/core/interceptor';
import { StringToNumber } from '@shared/transformer';
import { IsNumber, IsString, IsUrl } from 'class-validator';

@Configuration()
export class RequestTimeoutConfig implements TimeoutInterceptorConfig {
	[key: string]: number;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty()
	CORE_INCOMING_REQUEST_TIMEOUT_MS!: number;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty()
	INCOMING_REQUEST_TIMEOUT_COPY_API_MS!: number;
}

@Configuration()
export class FilesPreviewAppConfig {
	@IsUrl({ require_tld: false })
	@ConfigProperty()
	FILES_STORAGE_S3_ENDPOINT = 'http://localhost:9000/';

	@IsString()
	@ConfigProperty()
	FILES_STORAGE_S3_REGION = 'eu-central-1';

	@IsString()
	@ConfigProperty()
	FILES_STORAGE_S3_BUCKET = 'schulcloud';

	@IsString()
	@ConfigProperty()
	FILES_STORAGE_S3_ACCESS_KEY_ID = 'miniouser';

	@IsString()
	@ConfigProperty()
	FILES_STORAGE_S3_SECRET_ACCESS_KEY = 'miniouser';
}
