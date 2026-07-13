import { type Loggable, type LogMessage } from '@infra/logger';
import {
	type FileRecordIdentifier,
	type MultipleFileRecordIdentifier,
	type ParentIdentifier,
} from '@shared/domain/interface/file-record.interface';
import { type Request } from 'express';

type AllowedProperties = keyof FileRecordIdentifier | keyof MultipleFileRecordIdentifier | keyof ParentIdentifier;

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
			},
		};
	}

	// Use shared interface property names for type safety
	public allowedProperties: AllowedProperties[] = ['fileRecordId', 'fileRecordIds', 'parentId', 'parentType'];

	private sanitizeRequestParams(): Record<string, unknown> {
		const paramEntries = Object.entries(this.request.params);
		const filteredEntries = paramEntries.filter(([key]) => this.allowedProperties.includes(key as AllowedProperties));
		const sanitizedParams = Object.fromEntries(filteredEntries);

		return sanitizedParams;
	}
}
