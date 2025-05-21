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
}

export const createS3ModuleOptions = async (config: FileStorageConfig): Promise<S3Config> => {
	return {
		connectionName: FILES_STORAGE_S3_CONNECTION,
		endpoint: config.FILES_STORAGE_S3_ENDPOINT,
		region: config.FILES_STORAGE_S3_REGION,
		bucket: config.FILES_STORAGE_S3_BUCKET,
		accessKeyId: config.FILES_STORAGE_S3_ACCESS_KEY_ID,
		secretAccessKey: config.FILES_STORAGE_S3_SECRET_ACCESS_KEY,
	};
};

export const defaultConfig = {
	NEST_LOG_LEVEL: 'debug',
	INCOMING_REQUEST_TIMEOUT: 4999,
};

/*export const authorizationClientConfig: AuthorizationClientConfig = {
	basePath: `${Configuration.get('API_HOST') as string}/v3/`,
};

const jwtAuthGuardConfig: JwtAuthGuardConfig = {
	// Node's process.env escapes newlines. We need to reverse it for the keys to work.
	// See: https://stackoverflow.com/questions/30400341/environment-variables-containing-newlines-in-node
	JWT_PUBLIC_KEY: (Configuration.get('JWT_PUBLIC_KEY') as string).replace(/\\n/g, '\n'),
	JWT_SIGNING_ALGORITHM: Configuration.get('JWT_SIGNING_ALGORITHM') as Algorithm,
	SC_DOMAIN: Configuration.get('SC_DOMAIN') as string,
};

const fileStorageConfig: FileStorageConfig = {
	MAX_FILE_SIZE: Configuration.get('FILES_STORAGE__MAX_FILE_SIZE') as number,
	MAX_SECURITY_CHECK_FILE_SIZE: Configuration.get('FILES_STORAGE__MAX_FILE_SIZE') as number,
	USE_STREAM_TO_ANTIVIRUS: Configuration.get('FILES_STORAGE__USE_STREAM_TO_ANTIVIRUS') as boolean,
	...authorizationClientConfig,
	...defaultConfig,
	...jwtAuthGuardConfig,
	//EXIT_ON_ERROR: Configuration.get('EXIT_ON_ERROR') as boolean,
};
*/
