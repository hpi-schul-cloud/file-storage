import { Configuration } from '@infra/configuration';
import { IsUrl } from 'class-validator';

@Configuration()
export class CollaboraConfig {
	@IsUrl({ require_tld: false })
	COLLABORA_ONLINE_URL!: string;
}
