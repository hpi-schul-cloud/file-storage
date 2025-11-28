import { ErrorLogger, Loggable, LoggingUtils, LogMessageDataObject } from '@infra/logger';
import { Injectable } from '@nestjs/common';
import util from 'util';
import { ErrorLoggable } from '../loggable';

@Injectable()
export class DomainErrorHandler {
	constructor(private readonly logger: ErrorLogger) {}

	public exec(error: unknown): void {
		const loggable = this.createErrorLoggable(error);
		this.logger.error(loggable);
	}

	public execHttpContext(error: unknown): void {
		const loggable = this.createErrorLoggable(error);

		this.logger.error(loggable);
	}

	private createErrorLoggable(error: unknown, data?: LogMessageDataObject): Loggable {
		let loggable: Loggable;

		if (LoggingUtils.isInstanceOfLoggable(error)) {
			loggable = error;
		} else if (error instanceof Error) {
			loggable = new ErrorLoggable(error, data);
		} else {
			const unknownError = new Error(util.inspect(error));
			loggable = new ErrorLoggable(unknownError, data);
		}

		return loggable;
	}
}
