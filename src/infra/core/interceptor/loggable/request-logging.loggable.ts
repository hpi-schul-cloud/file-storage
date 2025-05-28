import { Loggable, LogMessage } from '@infra/logger';
import { Request } from 'express';

export class RequestLoggingLoggable implements Loggable {
	constructor(
		private readonly userId: string,
		private readonly request: Request
	) {}

	public getLogMessage(): LogMessage {
		return {
			message: RequestLoggingLoggable.name,
			data: {
				userId: this.userId,
				url: this.request.url,
				method: this.request.method,
				params: JSON.stringify(this.request.params),
				query: JSON.stringify(this.request.query),
			},
		};
	}
}
