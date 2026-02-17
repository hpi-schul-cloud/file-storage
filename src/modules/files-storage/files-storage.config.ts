import { ConfigProperty, Configuration } from '@infra/configuration';
import { S3Config } from '@infra/s3-client';
import { StringToBoolean, StringToNumber } from '@shared/transformer';
import { IsBoolean, IsNumber, IsString, IsUrl } from 'class-validator';
export const FILES_STORAGE_S3_CONNECTION = 'FILES_STORAGE_S3_CONNECTION';

export const FILE_STORAGE_CONFIG_TOKEN = 'FILE_STORAGE_CONFIG_TOKEN';

@Configuration()
export class FileStorageConfig {
	@IsNumber()
	@StringToNumber()
	@ConfigProperty()
	FILES_STORAGE_MAX_FILE_SIZE = 2684354560;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty()
	FILES_STORAGE_MAX_SECURITY_CHECK_FILE_SIZE = 2684354560;

	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty()
	FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS = false;

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

	/**
	 * @deprecated is config from wopi module, but we need it here until we refactor isCollaboraEditable logic
	 */
	@IsNumber()
	@StringToNumber()
	@ConfigProperty()
	COLLABORA_MAX_FILE_SIZE_IN_BYTES = 104857600;
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
