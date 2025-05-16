import { ErrorLogMessage, LogMessage, ValidationErrorLogMessage } from '../interfaces';

export interface Loggable {
	getLogMessage(): LogMessage | ErrorLogMessage | ValidationErrorLogMessage;
}
