import { type ErrorLogMessage, type LogMessage, type ValidationErrorLogMessage } from '../interfaces';

export interface Loggable {
	getLogMessage(): LogMessage | ErrorLogMessage | ValidationErrorLogMessage;
}
