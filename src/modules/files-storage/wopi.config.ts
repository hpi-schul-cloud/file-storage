import { StringToNumber } from '@shared/transformer';
import { IsInt, IsUrl } from 'class-validator';

export class WopiConfig {
	@IsUrl({ require_tld: false })
	WOPI_URL = 'http://localhost:4444/api/v3/wopi/files';

	@IsInt()
	@StringToNumber()
	WOPI_TOKEN_TTL_IN_SECONDS = 7200;
}
