import { TimeoutInterceptorConfig } from '@infra/core/interceptor';
import { Injectable } from '@nestjs/common';
import { StringToNumber } from '@shared/transformer';
import { IsNumber, IsString, IsUrl } from 'class-validator';

export class RequestTimeoutConfig implements TimeoutInterceptorConfig {
	[key: string]: number;

	@IsNumber()
	@StringToNumber()
	CORE_INCOMING_REQUEST_TIMEOUT_MS!: number;

	@IsNumber()
	@StringToNumber()
	INCOMING_REQUEST_TIMEOUT_COPY_API_MS!: number;
}

@Injectable()
export class FilesPreviewAppConfig {
	@IsUrl({ require_tld: false })
	FILES_STORAGE_S3_ENDPOINT = 'http://localhost:9000/';

	@IsString()
	FILES_STORAGE_S3_REGION = 'eu-central-1';

	@IsString()
	FILES_STORAGE_S3_BUCKET = 'schulcloud';

	@IsString()
	FILES_STORAGE_S3_ACCESS_KEY_ID = 'miniouser';

	@IsString()
	FILES_STORAGE_S3_SECRET_ACCESS_KEY = 'miniouser';
}
