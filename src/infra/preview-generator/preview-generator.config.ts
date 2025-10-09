import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToNumber } from '@shared/transformer';
import { IsNumber } from 'class-validator';

@Configuration()
export class PreviewGeneratorConfig {
	@IsNumber()
	@StringToNumber()
	@ConfigProperty()
	PREVIEW_PRODUCER_INCOMING_REQUEST_TIMEOUT!: number;
}
