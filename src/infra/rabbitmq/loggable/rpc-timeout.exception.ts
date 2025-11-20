import { ErrorLogMessage, Loggable } from '@infra/logger';
import { InternalServerErrorException } from '@nestjs/common';

export class RpcTimeoutException extends Error implements Loggable {
	constructor(private readonly error?: Error) {
		super('RPC_TIMEOUT');
	}

	public getLogMessage(): ErrorLogMessage {
		const message: ErrorLogMessage = {
			type: InternalServerErrorException.name,
			stack: this.stack,
			error: this.error,
		};

		return message;
	}
}
