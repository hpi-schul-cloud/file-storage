import { ConfigProperty, Configuration } from '@infra/configuration';
import { IsUrl } from 'class-validator';

@Configuration()
export class AuthorizationConfig {
	@IsUrl({ require_tld: false })
	@ConfigProperty()
	AUTHORIZATION_API_URL!: string;
}
