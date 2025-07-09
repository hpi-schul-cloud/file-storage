import { IsUrl } from 'class-validator';

export class WopiConfig {
	@IsUrl({ require_tld: false })
	WOPI_URL!: string;
}
