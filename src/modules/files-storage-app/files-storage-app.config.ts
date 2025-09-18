import { TimeoutInterceptorConfig } from '@infra/core/interceptor';
import { StringToNumber } from '@shared/transformer';
import { IsNumber } from 'class-validator';

export class RequestTimeoutConfig implements TimeoutInterceptorConfig {
	[key: string]: number;

	@IsNumber()
	@StringToNumber()
	CORE_INCOMING_REQUEST_TIMEOUT_MS!: number;

	@IsNumber()
	@StringToNumber()
	INCOMING_REQUEST_TIMEOUT_COPY_API_MS!: number;
}
