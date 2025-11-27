import { LogMessage, Loggable } from '@infra/logger';

export class UploadAbortLoggable implements Loggable {
	constructor(
		private readonly message: string,
		private readonly reason: string
	) {}

	public getLogMessage(): LogMessage {
		return {
			message: this.message,
			data: {
				reason: this.reason,
			},
		};
	}
}
