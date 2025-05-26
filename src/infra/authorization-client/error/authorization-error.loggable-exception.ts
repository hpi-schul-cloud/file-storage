import { ErrorLogMessage } from '@infra/logger';
import { Loggable } from '@infra/logger/interfaces';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationBodyParams } from '../authorization-api-client';

export class AuthorizationErrorLoggableException extends ForbiddenException implements Loggable {
	constructor(
		private readonly error: unknown,
		private readonly params: AuthorizationBodyParams
	) {
		super();
	}

	public getLogMessage(): ErrorLogMessage {
		const error = this.error instanceof Error ? this.error : new Error(JSON.stringify(this.error));
		const message: ErrorLogMessage = {
			type: 'INTERNAL_SERVER_ERROR',
			error,
			stack: this.stack,
			data: {
				action: this.params.context.action,
				referenceId: this.params.referenceId,
				referenceType: this.params.referenceType,
				requiredPermissions: this.params.context.requiredPermissions.join(','),
			},
		};

		return message;
	}
}
