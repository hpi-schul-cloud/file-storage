import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Logger } from '@infra/logger';
import { RabbitMQConnectionMonitor } from './rabbitmq-connection.monitor';
import { RabbitMQMessageReturnLoggable } from './loggable';

describe('RabbitMQConnectionMonitor', () => {
	let service: RabbitMQConnectionMonitor;
	let amqpConnection: DeepMocked<AmqpConnection>;
	let logger: DeepMocked<Logger>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RabbitMQConnectionMonitor,
				{
					provide: AmqpConnection,
					useValue: createMock<AmqpConnection>(),
				},
				{
					provide: Logger,
					useValue: createMock<Logger>(),
				},
			],
		}).compile();

		service = module.get<RabbitMQConnectionMonitor>(RabbitMQConnectionMonitor);
		amqpConnection = module.get(AmqpConnection);
		logger = module.get(Logger);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('should set logger context to RabbitMQConnectionMonitor', () => {
		expect(logger.setContext).toHaveBeenCalledWith('RabbitMQConnectionMonitor');
	});

	describe('onModuleInit', () => {
		it('should setup channel handlers', async () => {
			const mockAddSetup = jest.fn();
			(amqpConnection.managedChannel as unknown) = {
				addSetup: mockAddSetup,
			};

			await service.onModuleInit();

			expect(mockAddSetup).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should setup return handler on channel and log warning when message is returned', async () => {
			const mockChannel = {
				on: jest.fn(),
			};
			const mockAddSetup = jest.fn().mockImplementation(async (callback) => {
				await callback(mockChannel);
			});

			(amqpConnection.managedChannel as unknown) = {
				addSetup: mockAddSetup,
			};

			await service.onModuleInit();

			expect(mockChannel.on).toHaveBeenCalledWith('return', expect.any(Function));

			// Test the return callback
			const returnCallback = mockChannel.on.mock.calls[0][1];
			const mockMessage = {
				fields: {
					replyText: 'NO_ROUTE',
					exchange: 'test-exchange',
					routingKey: 'test.route',
				},
			};

			returnCallback(mockMessage);

			expect(logger.warning).toHaveBeenCalledWith(expect.any(RabbitMQMessageReturnLoggable));
		});
	});
});
