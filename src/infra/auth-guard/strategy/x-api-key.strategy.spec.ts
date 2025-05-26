import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { XApiKeyConfig } from '../x-api-key.config';
import { XApiKeyStrategy } from './x-api-key.strategy';

describe('XApiKeyStrategy', () => {
	let module: TestingModule;
	let strategy: XApiKeyStrategy;
	let config: XApiKeyConfig;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [],
			providers: [
				XApiKeyStrategy,
				{
					provide: XApiKeyConfig,
					useValue: {
						X_API_ALLOWED_KEYS: ['7ccd4e11-c6f6-48b0-81eb-cccf7922e7a4'],
					},
				},
			],
		}).compile();

		strategy = module.get(XApiKeyStrategy);
		config = module.get(XApiKeyConfig);
	});

	afterAll(async () => {
		await module.close();
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('validate', () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
		const done = jest.fn((error: Error | null, data: boolean | null) => {});
		describe('when a valid api key is provided', () => {
			const setup = () => {
				const CORRECT_API_KEY = '7ccd4e11-c6f6-48b0-81eb-cccf7922e7a4';

				return { CORRECT_API_KEY, done };
			};
			it('should do nothing', () => {
				const { CORRECT_API_KEY } = setup();
				strategy.validate(CORRECT_API_KEY, done);
				expect(done).toHaveBeenCalledWith(null, true);
			});
		});

		describe('when a invalid api key is provided', () => {
			const setup = () => {
				const INVALID_API_KEY = '7ccd4e11-c6f6-48b0-81eb-cccf7922e7a4BAD';

				return { INVALID_API_KEY, done };
			};
			it('should throw error', () => {
				const { INVALID_API_KEY } = setup();
				strategy.validate(INVALID_API_KEY, done);
				expect(done).toHaveBeenCalledWith(new UnauthorizedException(), null);
			});
		});
	});

	describe('constructor', () => {
		it('should create strategy', () => {
			const ApiKeyStrategy = new XApiKeyStrategy(config);
			expect(ApiKeyStrategy).toBeDefined();
			expect(ApiKeyStrategy).toBeInstanceOf(XApiKeyStrategy);
		});
	});
});
