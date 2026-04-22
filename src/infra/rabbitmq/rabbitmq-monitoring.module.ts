import { LoggerModule } from '@infra/logger';
import { Global, Module } from '@nestjs/common';
import { RabbitMQConnectionMonitor } from './rabbitmq-connection.monitor';

@Global()
@Module({
	imports: [LoggerModule],
	providers: [RabbitMQConnectionMonitor],
	exports: [RabbitMQConnectionMonitor],
})
export class RabbitMQMonitoringModule {}
