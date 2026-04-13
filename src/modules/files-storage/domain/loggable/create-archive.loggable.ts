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
		const log = {
			message: this.message,
			error: this.error,
			data: {
				action: this.action,
				fileIds: this.files.map((file) => file.id).join(','),
			},
		};

		return log;
	}
}
