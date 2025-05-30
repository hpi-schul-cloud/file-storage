import { LogMessage, Loggable } from '@infra/logger';
import { PreviewFileOptions } from '../interface';

export class PreviewActionsLoggable implements Loggable {
	constructor(
		private readonly message: string,
		private readonly payload: PreviewFileOptions
	) {}

	public getLogMessage(): LogMessage {
		const { originFilePath, previewFilePath, previewOptions } = this.payload;

		return {
			message: this.message,
			data: {
				originFilePath,
				previewFilePath,
				format: previewOptions.format,
				width: previewOptions.width,
			},
		};
	}
}
