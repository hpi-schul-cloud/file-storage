import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToNumber } from '@shared/transformer';
import { IsNumber, IsOptional, IsUrl } from 'class-validator';

export const AUTHORIZATION_CONFIG_TOKEN = 'AUTHORIZATION_CONFIG_TOKEN';

@Configuration()
export class AuthorizationConfig {
	@IsUrl({ require_tld: false })
	@ConfigProperty('AUTHORIZATION_API_URL')
	authorizationApiUrl!: string;

	@IsOptional()
	@IsNumber()
	@StringToNumber()
	@ConfigProperty('FILES_STORAGE_AUTHORIZATION_CLIENT_MAX_SOCKETS')
	maxSockets = 50;
}
