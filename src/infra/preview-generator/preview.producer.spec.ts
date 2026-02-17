import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Logger } from '@infra/logger';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorMapper } from '../rabbitmq';
import { FilesPreviewEvents, FilesPreviewExchange } from './files-preview.exchange';
import { PreviewFileOptions } from './interface';
import { PREVIEW_GENERATOR_CONFIG_TOKEN, PreviewGeneratorConfig } from './preview-generator.config';
import { PreviewProducer } from './preview.producer';

describe('PreviewProducer', () => {
	let module: TestingModule;
	let service: PreviewProducer;
	let amqpConnection: DeepMocked<AmqpConnection>;

	const timeout = 10000;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			providers: [
				PreviewProducer,
				{
					provide: Logger,
					useValue: createMock<Logger>(),
				},
				{
					provide: AmqpConnection,
					useValue: createMock<AmqpConnection>(),
				},
				{
					provide: PREVIEW_GENERATOR_CONFIG_TOKEN,
					useValue: createMock<PreviewGeneratorConfig>({
						PREVIEW_PRODUCER_INCOMING_REQUEST_TIMEOUT: timeout,
					}),
				},
			],
		}).compile();

		service = module.get(PreviewProducer);
		amqpConnection = module.get(AmqpConnection);
	});

	afterAll(async () => {
		await module.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('generate', () => {
		describe('when valid params are passed and amqp connection return with a message', () => {
			const setup = () => {
				const params: PreviewFileOptions = {
					originFilePath: 'file/test.jpeg',
					previewFilePath: 'preview/text.webp',
					previewOptions: {
						format: 'webp',
						width: 500,
					},
				};

				const message: string[] = [];
				amqpConnection.request.mockResolvedValueOnce({ message });

				const expectedParams = {
					exchange: FilesPreviewExchange,
					routingKey: FilesPreviewEvents.GENERATE_PREVIEW,
					payload: params,
					timeout,
					expiration: timeout * 1.1,
				};

				return { params, expectedParams, message };
			};

			it('should call the ampqConnection.', async () => {
				const { params, expectedParams } = setup();

				await service.generate(params);

				expect(amqpConnection.request).toHaveBeenCalledWith(expectedParams);
			});

			it('should return the response message.', async () => {
				const { params, message } = setup();

				const res = await service.generate(params);

				expect(res).toEqual(message);
			});
		});

		describe('when amqpConnection return with error in response', () => {
			const setup = () => {
				const params: PreviewFileOptions = {
					originFilePath: 'file/test.jpeg',
					previewFilePath: 'preview/text.webp',
					previewOptions: {
						format: 'webp',
						width: 500,
					},
				};

				const error = new Error('An error from called service');

				amqpConnection.request.mockResolvedValueOnce({ error });
				const spy = jest.spyOn(ErrorMapper, 'mapRpcErrorResponseToDomainError');

				return { params, spy, error };
			};

			it('should call error mapper and throw with error', async () => {
				const { params, spy, error } = setup();

				await expect(service.generate(params)).rejects.toThrow(ErrorMapper.mapRpcErrorResponseToDomainError(error));
				expect(spy).toHaveBeenCalled();
			});
		});
	});
});
