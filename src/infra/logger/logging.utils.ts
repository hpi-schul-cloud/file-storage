import { inspect } from 'node:util';
import { Loggable, LogMessageWithContext } from './interfaces';

export class LoggingUtils {
	public static createMessageWithContext(loggable: Loggable, context?: string | undefined): LogMessageWithContext {
		const message = loggable.getLogMessage();
		const stringifiedMessage = this.stringifyMessage(message);
		const messageWithContext = { message: stringifiedMessage, context };

		return messageWithContext;
	}

	private static stringifyMessage(message: unknown): string {
		const stringifiedMessage = inspect(message)
			.replaceAll('\n', '')
			.replaceAll(String.raw`\n`, '');

		return stringifiedMessage;
	}

	public static isInstanceOfLoggable(object: unknown): object is Loggable {
		return typeof object === 'object' && object !== null && 'getLogMessage' in object;
	}
}
