import { ConfigProperty, Configuration } from '@infra/configuration';
import { TimeoutInterceptorConfig } from '@infra/core/interceptor';
import { StringToNumber } from '@shared/transformer';
import { IsNumber } from 'class-validator';

export const FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN = 'FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN';

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
