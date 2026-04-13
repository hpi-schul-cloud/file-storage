import { Loggable, LogMessage } from '@infra/logger';
import { FileRecord } from '../file-record.do';

export class CreateArchiveLoggable implements Loggable {
	constructor(
		private readonly message: string,
		private readonly action: string,
		private readonly files: FileRecord[],
		private readonly error?: unknown
	) {}

	public getLogMessage(): LogMessage {
		const errorData =
			this.error instanceof Error
				? {
						error: this.error.message,
						...(this.error.stack !== undefined && { errorStack: this.error.stack }),
					}
				: this.error !== undefined
					? { error: String(this.error) }
					: {};

		const log = {
			message: this.message,
			data: {
				action: this.action,
				fileIds: this.files.map((file) => file.id).join(','),
				...errorData,
			},
		};

		return log;
	}
}
