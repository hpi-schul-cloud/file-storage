/**
 * We need this integration test to ensure that RpcMessageProducer works as expected
 * when AmqpConnection throws errors as specified in its code.
 */
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RequestTimeoutException } from '@nestjs/common';
import { RpcMessageProducer } from '.';

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
	let amqpConnection: AmqpConnection;

	beforeAll(() => {
		amqpConnection = new AmqpConnection({
			uri: 'amqp://localhost',
		});

		service = new RpcMessageProducerImp(amqpConnection);
	});

	describe('request timeout', () => {
		describe('when no consumer responds within the timeout period', () => {
			const setup = () => {
				const params: TestPayload = {
					value: true,
				};

				const message: string[] = [];

				jest.spyOn(amqpConnection, 'publish').mockResolvedValueOnce(true);

				const expectedParams = {
					exchange: TestExchange,
					routingKey: TestEvent,
					payload: params,
					timeout,
					expiration: timeout * 1.1,
				};

				return { params, expectedParams, message };
			};

			it('should throw RequestTimeoutException when no response is received within timeout', async () => {
				const { params } = setup();
				const startTime = Date.now();

				// Since we created the queue but no consumer, the request should timeout
				await expect(service.testRequest(params)).rejects.toThrow(
					new RequestTimeoutException(
						`Failed to receive response within timeout of ${timeout}ms for exchange "${TestExchange}" and routing key "${TestEvent}"`
					)
				);

				const elapsedTime = Date.now() - startTime;
				// Verify that the timeout actually occurred around the expected time (with some tolerance)
				expect(elapsedTime).toBeGreaterThanOrEqual(timeout - 100); // Allow 100ms tolerance
				expect(elapsedTime).toBeLessThan(timeout + 500); // Allow 500ms tolerance for processing
			});
		});
	});
});
