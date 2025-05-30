import { RabbitPayload, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { Logger } from '@infra/logger';
import { Injectable } from '@nestjs/common';
import { FilesPreviewEvents, FilesPreviewExchange } from './files-preview.exchange';
import { PreviewFileOptions, PreviewResponseMessage } from './interface';
import { PreviewActionsLoggable } from './loggable/preview-actions.loggable';
import { PreviewGeneratorService } from './preview-generator.service';

@Injectable()
export class PreviewGeneratorConsumer {
	constructor(
		private readonly previewGeneratorService: PreviewGeneratorService,
		private readonly logger: Logger
	) {
		this.logger.setContext(PreviewGeneratorConsumer.name);
	}

	@RabbitRPC({
		exchange: FilesPreviewExchange,
		routingKey: FilesPreviewEvents.GENERATE_PREVIEW,
		queue: FilesPreviewEvents.GENERATE_PREVIEW,
	})
	public async generatePreview(
		@RabbitPayload() payload: PreviewFileOptions
	): Promise<{ message: PreviewResponseMessage }> {
		this.logger.info(new PreviewActionsLoggable('PreviewGeneratorConsumer.generatePreview:start', payload));

		const response = await this.previewGeneratorService.generatePreview(payload);

		this.logger.info(new PreviewActionsLoggable('PreviewGeneratorConsumer.generatePreview:end', payload));

		return { message: response };
	}
}
