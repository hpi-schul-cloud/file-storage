import { StringToNumber } from '@shared/transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CoreModuleConfig {
	@IsNumber()
	@IsOptional()
	@StringToNumber()
	CORE_INCOMING_REQUEST_TIMEOUT!: number;
}
