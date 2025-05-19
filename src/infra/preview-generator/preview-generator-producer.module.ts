import { LoggerModule } from '@infra/logger';
import { RabbitMQWrapperModule } from '@infra/rabbitmq';
import { Module } from '@nestjs/common';
import { PreviewProducer } from './preview.producer';
import { FilesPreviewExchange } from './files-preview.exchange';

@Module({
	imports: [LoggerModule, RabbitMQWrapperModule.forRoot([FilesPreviewExchange])],
	providers: [PreviewProducer],
	exports: [PreviewProducer],
})
export class PreviewGeneratorProducerModule {}
