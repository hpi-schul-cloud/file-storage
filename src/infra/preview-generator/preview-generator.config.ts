import { StringToNumber } from '@shared/transformer';
import { IsNumber } from 'class-validator';

export class PreviewGeneratorConfig {
	@IsNumber()
	@StringToNumber()
	PREVIEW_PRODUCER_INCOMING_REQUEST_TIMEOUT!: number;
}
