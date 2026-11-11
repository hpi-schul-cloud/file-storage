import { type LogMessage, type LogMessageDataObject, type Loggable } from '@infra/logger';

export class StoredSvgPreviewCleanupLoggable implements Loggable {
	constructor(
		private readonly message: string,
		private readonly data: LogMessageDataObject
	) {}

	public getLogMessage(): LogMessage {
		return {
			message: this.message,
			data: this.data,
		};
	}
}
