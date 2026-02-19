import { LoggerModule } from '@infra/logger';
import { RabbitMQWrapperModule } from '@infra/rabbitmq';
import { DynamicModule, Module } from '@nestjs/common';
import { FilesPreviewExchange } from './files-preview.exchange';
import { PreviewModuleAsyncOptions } from './interface/module-options.type';
import { PreviewGeneratorConsumer } from './preview-generator.consumer';
import { PreviewGeneratorService } from './preview-generator.service';

@Module({})
export class PreviewGeneratorConsumerModule {
	public static registerAsync(options: PreviewModuleAsyncOptions): DynamicModule {
		const providers = [PreviewGeneratorService, PreviewGeneratorConsumer];

		return {
			module: PreviewGeneratorConsumerModule,
			imports: [LoggerModule, RabbitMQWrapperModule.forRoot([FilesPreviewExchange]), ...(options.imports ?? [])],
			providers: [...providers],
			exports: providers,
		};
	}
}
