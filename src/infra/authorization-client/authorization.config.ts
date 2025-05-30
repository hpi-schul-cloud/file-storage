import { IsUrl } from 'class-validator';

export class AuthorizationConfig {
	@IsUrl({ require_tld: false })
	AUTHORIZATION_API_URL!: string;
}
