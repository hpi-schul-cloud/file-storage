import { S3Client } from '@aws-sdk/client-s3';
import { ConfiguredRetryStrategy, RETRY_MODES } from '@aws-sdk/util-retry';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent } from 'node:https';
import { FolderLifecycleRule, S3Config } from './interface';
import { S3ClientAdapter } from './s3-client.adapter';

export class S3ClientFactory {
	public static build(
		config: S3Config,
		logger: Logger,
		domainErrorHandler: DomainErrorHandler,
		clientInjectionToken: string,
		folderLifecycleRules?: FolderLifecycleRule[],
		deletedFolderName?: string
	): S3ClientAdapter {
		const { region, accessKeyId, secretAccessKey, endpoint, maximumAttempts, backoffDelayTimeMs, maxSockets } = config;
		const retryStrategy = new ConfiguredRetryStrategy(
			maximumAttempts,
			(attempt: number) => attempt * backoffDelayTimeMs
		);

		const httpsAgent = new Agent({ maxSockets, keepAlive: true, keepAliveMsecs: 10_000 });
		const requestHandler = new NodeHttpHandler({ httpsAgent });

		const s3Client = new S3Client({
			region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
			endpoint,
			forcePathStyle: true,
			tls: true,
			retryMode: RETRY_MODES.STANDARD,
			retryStrategy,
			requestHandler,
		});

		return new S3ClientAdapter(
			s3Client,
			config,
			logger,
			domainErrorHandler,
			clientInjectionToken,
			folderLifecycleRules,
			deletedFolderName
		);
	}
}
