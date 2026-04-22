import { RabbitMQMessageReturnLoggable } from './rabbitmq-message-return.loggable';

describe('RabbitMQMessageReturnLoggable', () => {
	describe('getLogMessage', () => {
		it('should return structured log message with all required data', () => {
			const reason = 'NO_ROUTE';
			const messageFields = {
				exchange: 'test-exchange',
				routingKey: 'test.route.key',
			};

			const loggable = new RabbitMQMessageReturnLoggable(reason, messageFields);
			const logMessage = loggable.getLogMessage();

			expect(logMessage).toEqual({
				message: 'RabbitMQ message returned - delivery failed',
				data: {
					reason,
					exchange: messageFields.exchange,
					routingKey: messageFields.routingKey,
				},
			});
		});
	});
});
