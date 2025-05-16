/**
 * Information inside this file should be placed in shared, type are copied to it.
 */
export interface LogMessage {
	message: string;
	data?: LogMessageData;
}

export interface ErrorLogMessage {
	error?: Error;
	type: string;
	stack?: string;
	data?: LogMessageDataObject;
}

export interface ValidationErrorLogMessage {
	validationErrors: string[];
	stack?: string;
	type: string;
}

export interface LogMessageWithContext {
	message: string;
	context: string | undefined;
}

export type LogMessageData = LogMessageDataObject | string | number | boolean | undefined;

export interface LogMessageDataObject {
	[key: string]: LogMessageData;
}
