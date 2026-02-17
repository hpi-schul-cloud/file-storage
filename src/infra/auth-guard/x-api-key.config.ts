import { ConfigProperty, Configuration } from '@infra/configuration';
import { Transform } from 'class-transformer';
import { IsArray } from 'class-validator';

export const X_API_KEY_CONFIG_TOKEN = 'X_API_KEY_CONFIG_TOKEN';

@Configuration()
export class XApiKeyConfig {
	@Transform(({ value }) => value.split(',').map((part: string) => (part.split(':').pop() ?? '').trim()))
	@IsArray()
	@ConfigProperty()
	X_API_ALLOWED_KEYS: string[] = [];
}
