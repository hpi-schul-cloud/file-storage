import { S3Client } from '@aws-sdk/client-s3';
import { ConfiguredRetryStrategy, RETRY_MODES } from '@aws-sdk/util-retry';
import { createMock } from '@golevelup/ts-jest';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'node:https';
import { S3Config } from './interface';
import { S3ClientAdapter } from './s3-client.adapter';
import { S3ClientFactory } from './s3-client.factory';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/util-retry', () => ({
	...jest.requireActual('@aws-sdk/util-retry'),
	ConfiguredRetryStrategy: jest.fn(),
}));
jest.mock('@smithy/node-http-handler');
jest.mock('node:https');
jest.mock('./s3-client.adapter');

const setup = () => {
	const bucket = 'test-bucket';
	const clientInjectionToken = 'TEST_CONNECTION';
	const config: S3Config = {
		endpoint: '',
		region: '',
		bucket,
		accessKeyId: '',
		secretAccessKey: '',
		maximumAttempts: 3,
		backoffDelayTimeMs: 500,
		maxSockets: 50,
	};
	const logger = createMock<Logger>();
	const errorHandler = createMock<DomainErrorHandler>();
	const client = createMock<S3Client>();
	const folderLifecycleRules = [
		{
			folder: 'temp',
			expirationDays: 3,
		},
	];

	return { config, bucket, logger, errorHandler, client, clientInjectionToken, folderLifecycleRules };
};

describe(S3ClientFactory.name, () => {
	describe('build', () => {
		it('should create NodeHttpHandler with an https Agent configured for keep-alive and maxSockets', () => {
			const { config, logger, errorHandler, clientInjectionToken } = setup();
			S3ClientFactory.build(config, logger, errorHandler, clientInjectionToken);

			expect(Agent).toHaveBeenCalledWith({
				maxSockets: config.maxSockets,
				keepAlive: true,
				keepAliveMsecs: 10_000,
			});
			const agentInstance = jest.mocked(Agent).mock.instances[0];
			expect(NodeHttpHandler).toHaveBeenCalledWith({ httpsAgent: agentInstance });
		});

		it('should create ConfiguredRetryStrategy with maximumAttempts and backoff delay function', () => {
			const { config, logger, errorHandler, clientInjectionToken } = setup();
			S3ClientFactory.build(config, logger, errorHandler, clientInjectionToken);

			expect(ConfiguredRetryStrategy).toHaveBeenCalledWith(config.maximumAttempts, expect.any(Function));
			const backoffFn = jest.mocked(ConfiguredRetryStrategy).mock.calls[0][1] as (attempt: number) => number;
			expect(backoffFn(1)).toBe(1 * config.backoffDelayTimeMs);
			expect(backoffFn(3)).toBe(3 * config.backoffDelayTimeMs);
		});

		it('should create S3Client with correctly config', () => {
			const { config, logger, errorHandler, clientInjectionToken } = setup();
			S3ClientFactory.build(config, logger, errorHandler, clientInjectionToken);

			expect(S3Client).toHaveBeenCalledWith({
				region: config.region,
				credentials: {
					accessKeyId: config.accessKeyId,
					secretAccessKey: config.secretAccessKey,
				},
				endpoint: config.endpoint,
				forcePathStyle: true,
				tls: true,
				retryMode: RETRY_MODES.STANDARD,
				retryStrategy: expect.any(ConfiguredRetryStrategy),
				requestHandler: expect.any(NodeHttpHandler),
			});
		});

		it('should create S3ClientAdapter with correctly config', () => {
			const { config, logger, errorHandler, client, clientInjectionToken, folderLifecycleRules } = setup();
			const deletedFolderName = 'test-trash';
			S3ClientFactory.build(
				config,
				logger,
				errorHandler,
				clientInjectionToken,
				folderLifecycleRules,
				deletedFolderName
			);

			expect(S3ClientAdapter).toHaveBeenCalledWith(
				client,
				config,
				logger,
				errorHandler,
				clientInjectionToken,
				folderLifecycleRules,
				deletedFolderName
			);
		});

		it('should create S3ClientAdapter without deletedFolderName when not provided', () => {
			const { config, logger, errorHandler, client, clientInjectionToken, folderLifecycleRules } = setup();
			S3ClientFactory.build(config, logger, errorHandler, clientInjectionToken, folderLifecycleRules);

			expect(S3ClientAdapter).toHaveBeenCalledWith(
				client,
				config,
				logger,
				errorHandler,
				clientInjectionToken,
				folderLifecycleRules,
				undefined
			);
		});

		it('should return an instance of S3ClientAdapter', () => {
			const { config, logger, errorHandler, clientInjectionToken } = setup();
			const result = S3ClientFactory.build(config, logger, errorHandler, clientInjectionToken);

			expect(result).toBeInstanceOf(S3ClientAdapter);
		});
	});
});
