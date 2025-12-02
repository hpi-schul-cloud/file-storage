import { Loggable, LogMessage } from '@infra/logger';
import {
	FileRecordIdentifier,
	MultipleFileRecordIdentifier,
	ParentIdentifier,
} from '@shared/domain/interface/file-record.interface';
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

	// Use shared interface property names for type safety
	public allowedProperties: (
		| keyof FileRecordIdentifier
		| keyof MultipleFileRecordIdentifier
		| keyof ParentIdentifier
	)[] = ['fileRecordId', 'fileRecordIds', 'parentId', 'parentType'];

	private sanitizeRequestParams(): Record<string, unknown> {
		const params = { ...this.request.params };

		const sanitizedParams: Record<string, unknown> = {};

		// Only include allowed properties to prevent sensitive data exposure in logs
		for (const key of this.allowedProperties) {
			if (params[key] !== undefined) {
				sanitizedParams[key] = params[key];
			}
		}

		return sanitizedParams;
	}
}
