import { AmqpConnectionManager, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigurationModule } from '@infra/configuration';
import { DynamicModule, Global, Module, OnModuleDestroy } from '@nestjs/common';
import { RabbitMqConfig } from './rabbitmq.config';

/**
 * https://www.npmjs.com/package/@golevelup/nestjs-rabbitmq#usage
 * we want to have the RabbitMQModule globally available, since it provides via a factory the AMQPConnection.
 * You shall not explicitly declare the AMQPConnection in your modules since it will create a new AMQPConnection which will not be initialized!
 *
 * Therefore, the combination of @Global() and export: [RabbitMQModule] is required.
 */
@Global()
@Module({})
export class RabbitMQWrapperModule {
	public static forRoot(exchanges: string[]): DynamicModule {
		return {
			module: RabbitMQWrapperModule,
			imports: [
				RabbitMQModule.forRootAsync({
					useFactory: (config: RabbitMqConfig) => ({
						prefetchCount: config.RABBITMQ_GLOBAL_PREFETCH_COUNT,
						exchanges: exchanges.map((exchange) => ({
							name: exchange,
							type: 'direct',
						})),
						uri: config.RABBITMQ_URI,
						connectionManagerOptions: {
							heartbeatIntervalInSeconds: config.RABBITMQ_HEARTBEAT_INTERVAL_IN_SECONDS,
						},
					}),
					inject: [RabbitMqConfig],
					imports: [ConfigurationModule.register(RabbitMqConfig)],
				}),
			],
			exports: [RabbitMQModule],
		};
	}
}

@Global()
@Module({
	imports: [
		ConfigurationModule.register(RabbitMqConfig),
		RabbitMQModule.forRootAsync({
			useFactory: (config: RabbitMqConfig) => ({
				prefetchCount: config.RABBITMQ_GLOBAL_PREFETCH_COUNT,
				uri: config.RABBITMQ_URI,
				connectionManagerOptions: {
					heartbeatIntervalInSeconds: config.RABBITMQ_HEARTBEAT_INTERVAL_IN_SECONDS,
				},
			}),
			inject: [RabbitMqConfig],
			imports: [ConfigurationModule.register(RabbitMqConfig)],
		}),
	],
	exports: [RabbitMQModule],
})
export class RabbitMQWrapperTestModule implements OnModuleDestroy {
	constructor(private readonly amqpConnectionManager: AmqpConnectionManager) {}

	// In tests, we need to close connections when the module is destroyed.
	public async onModuleDestroy(): Promise<void> {
		await Promise.all(
			this.amqpConnectionManager.getConnections().map((connection) => connection.managedConnection.close()),
		);
	}
}
