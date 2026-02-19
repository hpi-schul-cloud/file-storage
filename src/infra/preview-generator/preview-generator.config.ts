import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToNumber } from '@shared/transformer';
import { IsNumber } from 'class-validator';

export const PREVIEW_GENERATOR_CONFIG_TOKEN = 'PREVIEW_GENERATOR_CONFIG_TOKEN';

@Configuration()
export class PreviewGeneratorConfig {
	@IsNumber()
	@StringToNumber()
	@ConfigProperty('PREVIEW_PRODUCER_INCOMING_REQUEST_TIMEOUT')
	previewProducerIncomingRequestTimeout!: number;
}
