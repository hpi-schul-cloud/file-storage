import { type ErrorLogMessage, type LogMessage, type ValidationErrorLogMessage } from './logging.interface';

export interface Loggable {
	getLogMessage(): LogMessage | ErrorLogMessage | ValidationErrorLogMessage;
}
