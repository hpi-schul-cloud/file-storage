import { ConfigProperty, Configuration } from '@infra/configuration';
import { IsUrl } from 'class-validator';

export const COLLABORA_CONFIG_TOKEN = 'COLLABORA_CONFIG_TOKEN';

@Configuration()
export class CollaboraConfig {
	@IsUrl({ require_tld: false })
	@ConfigProperty()
	COLLABORA_ONLINE_URL!: string;
}
