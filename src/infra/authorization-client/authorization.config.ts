import { ConfigProperty, Configuration } from '@infra/configuration';
import { IsUrl } from 'class-validator';

export const AUTHORIZATION_CONFIG_TOKEN = 'AUTHORIZATION_CONFIG_TOKEN';

@Configuration()
export class AuthorizationConfig {
	@IsUrl({ require_tld: false })
	@ConfigProperty('AUTHORIZATION_API_URL')
	authorizationApiUrl!: string;
}
