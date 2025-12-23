import { ErrorLogMessage } from '@infra/logger';
import { Loggable } from '@infra/logger/interfaces';
import { ForbiddenException } from '@nestjs/common';
import { ReferenceAuthorizationInfo } from '../vo';

export class AuthorizationManyReferencesForbiddenLoggableException extends ForbiddenException implements Loggable {
	constructor(private readonly references: ReferenceAuthorizationInfo[]) {
		super();
	}

	public getLogMessage(): ErrorLogMessage {
		const references = this.references.map((reference) => ({
			referenceType: reference.referenceType,
			referenceId: reference.referenceId,
		}));
		const data = { references: JSON.stringify(references) };
		const message: ErrorLogMessage = {
			type: 'FORBIDDEN_EXCEPTION',
			stack: this.stack,
			data: data,
		};

		return message;
	}
}
