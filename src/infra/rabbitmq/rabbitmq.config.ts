import { IsNumber, IsString } from 'class-validator';

export class RabbitMqConfig {
	@IsNumber()
	RABBITMQ_GLOBAL_PREFETCH_COUNT = 5;

	@IsNumber()
	RABBITMQ_HEARTBEAT_INTERVAL_IN_SECONDS = 20;

	@IsString()
	RABBITMQ_URI!: string;
}
