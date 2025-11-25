import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToNumber } from '@shared/transformer';
import { IsNumber, IsString } from 'class-validator';

@Configuration()
export class RabbitMqConfig {
	@IsNumber()
	@StringToNumber()
	@ConfigProperty()
	RABBITMQ_GLOBAL_PREFETCH_COUNT = 1;

	@IsNumber()
	@StringToNumber()
	@ConfigProperty()
	RABBITMQ_HEARTBEAT_INTERVAL_IN_SECONDS = 20;

	@IsString()
	@ConfigProperty()
	RABBITMQ_URI!: string;
}
