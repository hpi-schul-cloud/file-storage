import { LogMessage, Loggable } from '@infra/logger';

export class RabbitMQMessageReturnLoggable implements Loggable {
	constructor(
		private readonly reason: string,
		private readonly messageFields: {
			exchange: string;
			routingKey: string;
		}
	) {}

	public getLogMessage(): LogMessage {
		return {
			message: 'RabbitMQ message returned - delivery failed',
			data: {
				reason: this.reason,
				exchange: this.messageFields.exchange,
				routingKey: this.messageFields.routingKey,
			},
		};
	}
}
