import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Logger } from '@infra/logger';
import { RabbitMQMessageReturnLoggable } from './loggable';

@Injectable()
export class RabbitMQConnectionMonitor implements OnModuleInit {
	constructor(
		private readonly amqpConnection: AmqpConnection,
		private readonly logger: Logger
	) {
		this.logger.setContext(RabbitMQConnectionMonitor.name);
	}

	public async onModuleInit(): Promise<void> {
		await this.setupChannelHandlers();
	}

	private async setupChannelHandlers(): Promise<void> {
		await this.amqpConnection.managedChannel.addSetup((channel: unknown) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(channel as any).on('return', (msg: unknown) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const msgFields = (msg as any).fields;
				const loggable = new RabbitMQMessageReturnLoggable(msgFields.replyText, {
					exchange: msgFields.exchange,
					routingKey: msgFields.routingKey,
				});
				this.logger.warning(loggable);
			});
		});
	}
}
