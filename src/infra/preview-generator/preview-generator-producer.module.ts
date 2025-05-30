import { ConfigurationModule } from '@infra/configuration';
import { LoggerModule } from '@infra/logger';
import { RabbitMQWrapperModule } from '@infra/rabbitmq';
import { Module } from '@nestjs/common';
import { FilesPreviewExchange } from './files-preview.exchange';
import { PreviewGeneratorConfig } from './preview-generator.config';
import { PreviewProducer } from './preview.producer';

@Module({
	imports: [
		LoggerModule,
		RabbitMQWrapperModule.forRoot([FilesPreviewExchange]),
		ConfigurationModule.register(PreviewGeneratorConfig),
	],
	providers: [PreviewProducer],
	exports: [PreviewProducer],
})
export class PreviewGeneratorProducerModule {}
