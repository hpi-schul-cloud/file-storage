
import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToBoolean, StringToNumber } from '@shared/transformer';
import { IsBoolean, IsInt, IsNumber, IsUrl } from 'class-validator';

@Configuration()
export class WopiPublicApiConfig {
	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty()
	FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = false;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty()
	COLLABORA_MAX_FILE_SIZE_IN_BYTES = 104857600;
}

@Configuration()
export class WopiConfig extends WopiPublicApiConfig {
	@IsUrl({ require_tld: false })
	@ConfigProperty()
	WOPI_URL!: string;

	// @see https://sdk.collaboraonline.com/docs/advanced_integration.html#postmessageorigin
	@IsUrl({ require_tld: false })
	@ConfigProperty()
	WOPI_POST_MESSAGE_ORIGIN!: string;

	@IsInt()
	@StringToNumber()
	@ConfigProperty()
	WOPI_TOKEN_TTL_IN_SECONDS = 7200;
}
