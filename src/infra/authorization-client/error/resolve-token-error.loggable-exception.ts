import { ErrorLogMessage } from '@infra/logger';
import { Loggable } from '@infra/logger/interfaces';
import { ForbiddenException } from '@nestjs/common';

export class ResolveTokenErrorLoggableException extends ForbiddenException implements Loggable {
	constructor(
		private readonly error: unknown,
		private readonly token: string
	) {
		super();
	}

	public getLogMessage(): ErrorLogMessage {
		const error = this.error instanceof Error ? this.error : new Error(JSON.stringify(this.error));
		const message: ErrorLogMessage = {
			type: ResolveTokenErrorLoggableException.name,
			error,
			stack: this.stack,
			data: {
				token: this.token,
			},
		};

		return message;
	}
}
