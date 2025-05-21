import { ErrorLogMessage } from '@infra/logger';
import { Loggable } from '@infra/logger/interfaces';
import { ForbiddenException } from '@nestjs/common';
import { AuthorizationBodyParams } from '../authorization-api-client';

export class AuthorizationForbiddenLoggableException extends ForbiddenException implements Loggable {
	constructor(private readonly params: AuthorizationBodyParams) {
		super();
	}

	public getLogMessage(): ErrorLogMessage {
		const message: ErrorLogMessage = {
			type: 'FORBIDDEN_EXCEPTION',
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
