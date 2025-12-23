import { ErrorLogMessage } from '@infra/logger';
import { Loggable } from '@infra/logger/interfaces';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationManyReferencesBodyParams } from '../authorization-api-client';
import { AuthorizationErrorLoggableException } from './authorization-error.loggable-exception';

export class AuthorizationManyReferencesErrorLoggableException extends ForbiddenException implements Loggable {
	constructor(
		private readonly error: unknown,
		private readonly params: AuthorizationManyReferencesBodyParams
	) {
		super();
	}

	public getLogMessage(): ErrorLogMessage {
		const error = this.error instanceof Error ? this.error : new Error(JSON.stringify(this.error));
		const references = this.params.references.map((reference) => ({
			action: reference.context.action,
			referenceType: reference.referenceType,
			referenceId: reference.referenceId,
			requiredPermissions: reference.context.requiredPermissions.join(','),
		}));
		const data = { references: JSON.stringify(references) };
		const message: ErrorLogMessage = {
			type: AuthorizationErrorLoggableException.name,
			error,
			stack: this.stack,
			data: data,
		};

		return message;
	}
}
