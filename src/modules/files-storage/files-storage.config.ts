import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToBoolean, StringToNumber } from '@shared/transformer';
import { IsBoolean, IsNumber, IsString, IsUrl } from 'class-validator';

export const FILES_STORAGE_S3_CONNECTION = 'FILES_STORAGE_S3_CONNECTION';

export const FILE_STORAGE_CONFIG_TOKEN = 'FILE_STORAGE_CONFIG_TOKEN';
export const FILE_STORAGE_PUBLIC_API_CONFIG_TOKEN = 'FILE_STORAGE_PUBLIC_API_CONFIG_TOKEN';

export const INCOMING_REQUEST_TIMEOUT_COPY_API_KEY = 'incomingRequestTimeoutCopyApiMs';

@Configuration()
export class FileStoragePublicApiConfig {
	@IsNumber()
	@StringToNumber()
	@ConfigProperty('FILES_STORAGE_MAX_FILE_SIZE')
	filesStorageMaxFileSize = 2684354560;
}

@Configuration()
export class FileStorageConfig extends FileStoragePublicApiConfig {
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
	endpoint = 'http://localhost:9000/';

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_REGION')
	region = 'eu-central-1';

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_BUCKET')
	bucket = 'schulcloud';

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_ACCESS_KEY_ID')
	accessKeyId = 'miniouser';

	@IsString()
	@ConfigProperty('FILES_STORAGE_S3_SECRET_ACCESS_KEY')
	secretAccessKey = 'miniouser';

	/**
	 * @deprecated is config from wopi module, but we need it here until we refactor isCollaboraEditable logic
	 */
	@IsNumber()
	@StringToNumber()
	@ConfigProperty('COLLABORA_MAX_FILE_SIZE_IN_BYTES')
	collaboraMaxFileSizeInBytes = 104857600;
}
