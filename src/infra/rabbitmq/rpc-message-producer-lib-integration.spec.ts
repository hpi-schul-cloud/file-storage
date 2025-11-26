/**
 * We need this integration test to ensure that RpcMessageProducer works as expected
 * when AmqpConnection throws errors as specified in its code.
 */
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
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

			it('should throw error with expected message', async () => {
				const { params } = setup();

				await expect(service.testRequest(params)).rejects.toThrow(
					`Failed to receive response within timeout of ${timeout}ms for exchange "${TestExchange}" and routing key "${TestEvent}"`
				);
			});
		});
	});
});
