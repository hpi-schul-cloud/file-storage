import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToBoolean, StringToNumber } from '@shared/transformer';
import { IsBoolean, IsInt, IsNumber, IsUrl } from 'class-validator';

export const WOPI_PUBLIC_API_CONFIG_TOKEN = 'WOPI_PUBLIC_API_CONFIG_TOKEN';
export const WOPI_CONFIG_TOKEN = 'WOPI_CONFIG_TOKEN';

@Configuration()
export class WopiPublicApiConfig {
	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty('FEATURE_COLUMN_BOARD_COLLABORA_ENABLED')
	featureColumnBoardCollaboraEnabled = true;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty('COLLABORA_MAX_FILE_SIZE_IN_BYTES')
	collaboraMaxFileSizeInBytes = 104857600;
}

@Configuration()
export class WopiConfig extends WopiPublicApiConfig {
	@IsUrl({ require_tld: false })
	@ConfigProperty('WOPI_URL')
	wopiUrl!: string;

	// @see https://sdk.collaboraonline.com/docs/advanced_integration.html#postmessageorigin
	@IsUrl({ require_tld: false })
	@ConfigProperty('WOPI_POST_MESSAGE_ORIGIN')
	wopiPostMessageOrigin!: string;

	@IsInt()
	@StringToNumber()
	@ConfigProperty('WOPI_TOKEN_TTL_IN_SECONDS')
	wopiTokenTtlInSeconds = 7200;
}
