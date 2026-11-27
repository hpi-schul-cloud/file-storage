import { ConfigProperty, Configuration } from '@infra/configuration';
import { TimeoutInterceptorConfig } from '@infra/core/interceptor';
import { INCOMING_REQUEST_TIMEOUT_COPY_API_KEY, INCOMING_REQUEST_TIMEOUT_DELETE_API_KEY } from '@modules/files-storage';
import { StringToNumber } from '@shared/transformer';
import { IsNumber, IsUrl } from 'class-validator';

export const FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN = 'FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN';
export const FILES_STORAGE_AMQP_APP_REQUEST_TIMEOUT_CONFIG_TOKEN =
	'FILES_STORAGE_AMQP_APP_REQUEST_TIMEOUT_CONFIG_TOKEN';
export const FILES_STORAGE_APP_PUBLIC_ORIGIN_CONFIG_TOKEN = 'FILES_STORAGE_APP_PUBLIC_ORIGIN_CONFIG_TOKEN';

@Configuration()
export class RequestTimeoutConfig implements TimeoutInterceptorConfig {
	[key: string]: number;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty('CORE_INCOMING_REQUEST_TIMEOUT_MS')
	coreIncomingRequestTimeoutMs = 8000;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty('INCOMING_REQUEST_TIMEOUT_COPY_API_MS')
	[INCOMING_REQUEST_TIMEOUT_COPY_API_KEY] = 600000;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty('INCOMING_REQUEST_TIMEOUT_DELETE_API_MS')
	[INCOMING_REQUEST_TIMEOUT_DELETE_API_KEY] = 600000;
}

@Configuration()
export class PublicOriginConfig {
	@IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
	@ConfigProperty('HOST')
	publicOrigin = 'http://localhost:4000';
}
