import { Configuration } from '@infra/configuration';
import { IsUrl } from 'class-validator';

@Configuration()
export class AuthorizationConfig {
	@IsUrl({ require_tld: false })
	AUTHORIZATION_API_URL!: string;
}
