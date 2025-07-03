import { Configuration } from '@infra/configuration';
import { StringToNumber } from '@shared/transformer';
import { IsNumber, IsString } from 'class-validator';

@Configuration()
export class RabbitMqConfig {
	@IsNumber()
	@StringToNumber()
	RABBITMQ_GLOBAL_PREFETCH_COUNT = 5;

	@IsNumber()
	@StringToNumber()
	RABBITMQ_HEARTBEAT_INTERVAL_IN_SECONDS = 20;

	@IsString()
	RABBITMQ_URI!: string;
}
