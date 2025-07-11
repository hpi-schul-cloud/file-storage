import { TimeoutInterceptorConfig } from '@infra/core/interceptor';
import { S3Config } from '@infra/s3-client';
import { Injectable } from '@nestjs/common';
import { StringToBoolean, StringToNumber } from '@shared/transformer';
import { IsBoolean, IsNumber, IsString, IsUrl } from 'class-validator';

export const FILES_STORAGE_S3_CONNECTION = 'FILES_STORAGE_S3_CONNECTION';
@Injectable()
export class FileStorageConfig {
	@IsNumber()
	@StringToNumber()
	FILES_STORAGE_MAX_FILE_SIZE = 2684354560;

	@IsNumber()
	@StringToNumber()
	FILES_STORAGE_MAX_SECURITY_CHECK_FILE_SIZE = 2684354560;

	@IsBoolean()
	@StringToBoolean()
	FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS = false;

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

	@IsString()
	JWT_DOMAIN = 'localhost';
}

export class RequestTimeoutConfig implements TimeoutInterceptorConfig {
	[key: string]: number;

	@IsNumber()
	@StringToNumber()
	CORE_INCOMING_REQUEST_TIMEOUT_MS!: number;

	@IsNumber()
	@StringToNumber()
	INCOMING_REQUEST_TIMEOUT_COPY_API_MS!: number;
}

export const createS3ModuleOptions = (config: FileStorageConfig): S3Config => {
	return {
		connectionName: FILES_STORAGE_S3_CONNECTION,
		endpoint: config.FILES_STORAGE_S3_ENDPOINT,
		region: config.FILES_STORAGE_S3_REGION,
		bucket: config.FILES_STORAGE_S3_BUCKET,
		accessKeyId: config.FILES_STORAGE_S3_ACCESS_KEY_ID,
		secretAccessKey: config.FILES_STORAGE_S3_SECRET_ACCESS_KEY,
	};
};
