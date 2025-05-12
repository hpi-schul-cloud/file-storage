import { inspect } from 'node:util';
import { Loggable } from './interfaces';
import { LogMessageWithContext } from './types';

export class LoggingUtils {
	public static createMessageWithContext(loggable: Loggable, context?: string | undefined): LogMessageWithContext {
		const message = loggable.getLogMessage();
		const stringifiedMessage = this.stringifyMessage(message);
		const messageWithContext = { message: stringifiedMessage, context };

		return messageWithContext;
	}

	private static stringifyMessage(message: unknown): string {
		const stringifiedMessage = inspect(message).replace(/\n/g, '').replace(/\\n/g, '');

		return stringifiedMessage;
	}

	public static isInstanceOfLoggable(object: any): object is Loggable {
		return 'getLogMessage' in object;
	}
}
