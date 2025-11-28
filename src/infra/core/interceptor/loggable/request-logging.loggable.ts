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
				url: this.request.route.path,
				method: this.request.method,
				params: JSON.stringify(this.sanitizeRequestParams()),
				query: JSON.stringify(this.request.query),
			},
		};
	}

	private sanitizeRequestParams(): Record<string, unknown> {
		const params = { ...this.request.params };
		const allowedProperties = ['fileRecordId', 'fileRecordIds', 'parentId', 'parentType'];
		const sanitizedParams: Record<string, unknown> = {};

		// Only include allowed properties to prevent sensitive data exposure in logs
		for (const key of allowedProperties) {
			if (params[key] !== undefined) {
				sanitizedParams[key] = params[key];
			}
		}

		return sanitizedParams;
	}
}
