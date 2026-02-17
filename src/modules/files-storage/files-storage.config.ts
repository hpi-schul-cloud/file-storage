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
	@ConfigProperty('FILES_STORAGE_MAX_FILE_SIZE')
	filesStorageMaxFileSize = 2684354560;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty('FILES_STORAGE_MAX_SECURITY_CHECK_FILE_SIZE')
	filesStorageMaxSecurityCheckFileSize = 2684354560;

	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty('FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS')
	filesStorageUseStreamToAntivirus = false;

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

	/**
	 * @deprecated is config from wopi module, but we need it here until we refactor isCollaboraEditable logic
	 */
	@IsNumber()
	@StringToNumber()
	@ConfigProperty('COLLABORA_MAX_FILE_SIZE_IN_BYTES')
	collaboraMaxFileSizeInBytes = 104857600;
}

export const createS3ModuleOptions = (config: FileStorageConfig): S3Config => {
	return {
		connectionName: FILES_STORAGE_S3_CONNECTION,
		endpoint: config.filesStorageS3Endpoint,
		region: config.filesStorageS3Region,
		bucket: config.filesStorageS3Bucket,
		accessKeyId: config.filesStorageS3AccessKeyId,
		secretAccessKey: config.filesStorageS3SecretAccessKey,
	};
};
