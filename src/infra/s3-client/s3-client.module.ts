import { DomainErrorHandler, ErrorModule } from '@infra/error';
import { Logger, LoggerModule } from '@infra/logger';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { S3Config } from './interface';
import { S3_CLIENT_OPTIONS, S3ClientModuleAsyncOptions } from './interface/module-options.type';
import { S3ClientFactory } from './s3-client.factory';

@Module({})
export class S3ClientModule {
	public static register(injectionToken: string, config: S3Config): DynamicModule {
		const providers = [
			{
				provide: injectionToken,
				useFactory: (clientFactory: S3ClientFactory, logger: Logger, domainErrorHandler: DomainErrorHandler) =>
					clientFactory.build(config, logger, domainErrorHandler),
				inject: [S3ClientFactory, Logger, DomainErrorHandler],
			},
		];

		return {
			module: S3ClientModule,
			imports: [LoggerModule, ErrorModule],
			providers: [...providers, S3ClientFactory],
			exports: providers,
		};
	}

	public static registerAsync(options: S3ClientModuleAsyncOptions): DynamicModule {
		const providers = [
			{
				provide: options.injectionToken,
				useFactory: (
					clientFactory: S3ClientFactory,
					logger: Logger,
					domainErrorHandler: DomainErrorHandler,
					config: S3Config,
				) => clientFactory.build(config, logger, domainErrorHandler),
				inject: [S3ClientFactory, Logger, DomainErrorHandler, S3_CLIENT_OPTIONS],
			},
			S3ClientModule.createAsyncProviders(options),
		];

		return {
			module: S3ClientModule,
			imports: [LoggerModule, ErrorModule, ...(options.imports || [])],
			providers: [...providers, S3ClientFactory],
			exports: providers,
		};
	}

	private static createAsyncProviders(options: S3ClientModuleAsyncOptions): Provider {
		if (options.useFactory) {
			return {
				provide: S3_CLIENT_OPTIONS,
				useFactory: options.useFactory,
				inject: options.inject || [],
			};
		} else {
			throw new Error('S3ClientModule: useFactory is required');
		}
	}
}
