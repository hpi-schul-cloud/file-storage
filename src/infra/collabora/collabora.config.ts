import { IsUrl } from 'class-validator';

export class CollaboraConfig {
	@IsUrl({ require_tld: false })
	COLLABORA_ONLINE_URL = 'http://localhost:9980';
}
