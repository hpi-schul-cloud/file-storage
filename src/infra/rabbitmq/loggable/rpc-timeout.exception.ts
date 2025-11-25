import { ErrorLogMessage, Loggable } from '@infra/logger';

export class RpcTimeoutException extends Error implements Loggable {
	constructor(private readonly error?: Error) {
		super(error?.message);
	}

	public getLogMessage(): ErrorLogMessage {
		const message: ErrorLogMessage = {
			type: 'RPC_TIMEOUT',
			stack: this.stack,
			error: this.error,
		};

		return message;
	}
}
