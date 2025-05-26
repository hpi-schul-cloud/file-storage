import { ErrorLogMessage, Loggable } from '@infra/logger';
import { InternalServerErrorException } from '@nestjs/common';
import { PreviewFileOptions } from '../interface';
import { ErrorType } from '../interface/error-status.enum';

export class PreviewNotPossibleException extends InternalServerErrorException implements Loggable {
	constructor(
		private readonly payload: PreviewFileOptions,
		private readonly error?: Error
	) {
		super(ErrorType.CREATE_PREVIEW_NOT_POSSIBLE);
	}

	public getLogMessage(): ErrorLogMessage {
		const { originFilePath, previewFilePath, previewOptions } = this.payload;
		const message: ErrorLogMessage = {
			type: InternalServerErrorException.name,
			stack: this.stack,
			error: this.error,
			data: {
				originFilePath,
				previewFilePath,
				format: previewOptions.format,
				width: previewOptions.width,
			},
		};

		return message;
	}
}
