import { Loggable, LogMessage } from '@infra/logger';

export class FileTypeErrorLoggable implements Loggable {
	constructor(private readonly message: string) {}

	public getLogMessage(): LogMessage {
		return {
			message: this.message,
		};
	}
}
