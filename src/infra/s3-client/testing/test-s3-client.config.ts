import { ConfigProperty, Configuration } from '@infra/configuration';
import { S3Config } from '@infra/s3-client';
import { IsString, IsUrl } from 'class-validator';

export const TEST_S3_CLIENT_ONE_INJECTION_TOKEN = 'TEST_S3_CLIENT_ONE_INJECTION_TOKEN';

export const TEST_S3_CLIENT_ONE_CONFIG_TOKEN = 'TEST_S3_CLIENT_ONE_CONFIG_TOKEN';

@Configuration()
export class TestS3ClientConfigOne implements S3Config {
	@ConfigProperty()
	@IsUrl({ require_tld: false })
	endpoint = 'http://localhost:9000';

	@ConfigProperty()
	@IsString()
	region = 'eu-central-1';

	@ConfigProperty()
	@IsString()
	bucket = 'test-bucket-one';
	@ConfigProperty()
	@IsString()
	accessKeyId = 'test-access-key-id-one';

	@ConfigProperty()
	@IsString()
	secretAccessKey = 'test-secret-access-key-one';
}

export const TEST_S3_CLIENT_TWO_INJECTION_TOKEN = 'TEST_S3_CLIENT_TWO_INJECTION_TOKEN';

export const TEST_S3_CLIENT_TWO_CONFIG_TOKEN = 'TEST_S3_CLIENT_TWO_CONFIG_TOKEN';

@Configuration()
export class TestS3ClientConfigTwo implements S3Config {
	@ConfigProperty()
	@IsUrl({ require_tld: false })
	endpoint = 'http://localhost:9000';

	@ConfigProperty()
	@IsString()
	region = 'eu-central-1';

	@ConfigProperty()
	@IsString()
	bucket = 'test-bucket-two';
	@ConfigProperty()
	@IsString()
	accessKeyId = 'test-access-key-id-two';

	@ConfigProperty()
	@IsString()
	secretAccessKey = 'test-secret-access-key-two';
}
