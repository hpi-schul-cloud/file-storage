import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RequestTimeoutException } from '@nestjs/common';
import { RpcMessageProducer } from '.';
import { RabbitMQContainer } from '@testcontainers/rabbitmq';

interface TestPayload {
	value: boolean;
}

interface TestResponse {
	value: boolean;
}

const TestEvent = 'test-event';
const TestExchange = 'test-exchange';
const timeout = 1000;

class RpcMessageProducerImp extends RpcMessageProducer {
	constructor(protected readonly amqpConnection: AmqpConnection) {
		super(amqpConnection, TestExchange, timeout);
	}

	async testRequest(payload: TestPayload): Promise<TestResponse> {
		return await this.request<TestResponse>(TestEvent, payload);
	}
}

describe('RpcMessageProducer - Timeout Behavior', () => {
	let service: RpcMessageProducerImp;
	let startedRabbitMQContainer: any;
	let amqpConnection: AmqpConnection;
	const container = new RabbitMQContainer("rabbitmq:3.12.11-management-alpine");

	beforeAll(async () => {
		// needs to pull the image, so we increase the timeout
		jest.setTimeout(60000);
		startedRabbitMQContainer = await container.start();
		amqpConnection = new AmqpConnection({
			uri: startedRabbitMQContainer.getAmqpUrl(),
		});

		// Initialize the connection
		await amqpConnection.init();

		// Create exchange and queue
		const channel = amqpConnection.channel;
		await channel.assertExchange(TestExchange, 'direct', { durable: false });
		const queueName = `${TestEvent}-queue`;
		await channel.assertQueue(queueName, { durable: false, autoDelete: true });
		await channel.bindQueue(queueName, TestExchange, TestEvent);

		service = new RpcMessageProducerImp(amqpConnection);
	});

	afterAll(async () => {
		await amqpConnection.close();
		await startedRabbitMQContainer.stop();
	});

	describe('request timeout', () => {
		describe('when no consumer responds within the timeout period', () => {
			const setup = () => {
				const params: TestPayload = {
					value: true,
				};

				const message: string[] = [];

				const expectedParams = {
					exchange: TestExchange,
					routingKey: TestEvent,
					payload: params,
					timeout,
					expiration: timeout * 1.5,
				};

				return { params, expectedParams, message };
			};

			it('should throw RequestTimeoutException when no response is received within timeout', async () => {
				const { params } = setup();
				const startTime = Date.now();

				// Since we created the queue but no consumer, the request should timeout
				await expect(service.testRequest(params)).rejects.toThrow(RequestTimeoutException);

				const elapsedTime = Date.now() - startTime;
				// Verify that the timeout actually occurred around the expected time (with some tolerance)
				expect(elapsedTime).toBeGreaterThanOrEqual(timeout - 100); // Allow 100ms tolerance
				expect(elapsedTime).toBeLessThan(timeout + 500); // Allow 500ms tolerance for processing
			}, 10000);

		});
	});
});
