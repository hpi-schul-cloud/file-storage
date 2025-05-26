import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Logger } from '@infra/logger';
import { RpcMessageProducer } from '@infra/rabbitmq';
import { Injectable } from '@nestjs/common';
import { FilesPreviewEvents, FilesPreviewExchange } from './files-preview.exchange';
import { PreviewFileOptions, PreviewResponseMessage } from './interface';
import { PreviewActionsLoggable } from './loggable/preview-actions.loggable';
import { PreviewGeneratorConfig } from './preview-generator.config';

@Injectable()
export class PreviewProducer extends RpcMessageProducer {
	constructor(
		protected readonly amqpConnection: AmqpConnection,
		private readonly logger: Logger,
		protected readonly config: PreviewGeneratorConfig
	) {
		const timeout = config.PREVIEW_PRODUCER_INCOMING_REQUEST_TIMEOUT;

		super(amqpConnection, FilesPreviewExchange, timeout);
		this.logger.setContext(PreviewProducer.name);
	}

	public async generate(payload: PreviewFileOptions): Promise<PreviewResponseMessage> {
		this.logger.info(new PreviewActionsLoggable('PreviewProducer.generate:started', payload));

		const response = await this.request<PreviewResponseMessage>(FilesPreviewEvents.GENERATE_PREVIEW, payload);

		this.logger.info(new PreviewActionsLoggable('PreviewProducer.generate:finished', payload));

		return response;
	}
}
