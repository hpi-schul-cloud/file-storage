import { Configuration } from '@infra/configuration';
import { StringToNumber } from '@shared/transformer';
import { IsInt, IsUrl } from 'class-validator';

@Configuration()
export class WopiConfig {
	@IsUrl({ require_tld: false })
	WOPI_URL!: string;

	// @see https://sdk.collaboraonline.com/docs/advanced_integration.html#postmessageorigin
	@IsUrl({ require_tld: false })
	WOPI_POST_MESSAGE_ORIGIN!: string;

	@IsInt()
	@StringToNumber()
	WOPI_TOKEN_TTL_IN_SECONDS = 7200;
}
