import { LoggerModule } from '@infra/logger';
import { RabbitMQWrapperModule } from '@infra/rabbitmq';
import { S3ClientAdapter } from '@infra/s3-client';
import { DynamicModule, Module } from '@nestjs/common';
import { FilesPreviewExchange } from './files-preview.exchange';
import { PreviewModuleAsyncOptions } from './interface/module-options.type';
import { PreviewGeneratorConsumer } from './preview-generator.consumer';
import { FILE_STORAGE_CLIENT, PreviewGeneratorService } from './preview-generator.service';

@Module({})
export class PreviewGeneratorConsumerModule {
	static register(storageClient: S3ClientAdapter): DynamicModule {
		const providers = [
			PreviewGeneratorService,
			PreviewGeneratorConsumer,
			{
				provide: FILE_STORAGE_CLIENT,
				useValue: storageClient,
			},
		];

		return {
			module: PreviewGeneratorConsumerModule,
			imports: [LoggerModule, RabbitMQWrapperModule.forRoot([FilesPreviewExchange])],
			providers,
		};
	}

	public static registerAsync(options: PreviewModuleAsyncOptions): DynamicModule {
		const providers = [PreviewGeneratorService, PreviewGeneratorConsumer];

		return {
			module: PreviewGeneratorConsumerModule,
			imports: [LoggerModule, RabbitMQWrapperModule.forRoot([FilesPreviewExchange]), ...(options.imports || [])],
			providers: [...providers],
			exports: providers,
		};
	}
}
