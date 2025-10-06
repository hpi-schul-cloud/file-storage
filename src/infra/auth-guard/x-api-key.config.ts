import { ConfigProperty, Configuration } from '@infra/configuration';
import { Transform } from 'class-transformer';
import { IsArray } from 'class-validator';

@Configuration()
export class XApiKeyConfig {
	@Transform(({ value }) => value.split(',').map((part: string) => (part.split(':').pop() ?? '').trim()))
	@IsArray()
	@ConfigProperty()
	X_API_ALLOWED_KEYS: string[] = [];
}
