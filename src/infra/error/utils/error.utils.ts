import { HttpException, HttpExceptionOptions } from '@nestjs/common';
import { BusinessError } from '@shared/error';

export class ErrorUtils {
	public static isBusinessError(error: unknown): error is BusinessError {
		return error instanceof BusinessError;
	}

	public static isNestHttpException(error: unknown): error is HttpException {
		return error instanceof HttpException;
	}

	public static createHttpExceptionOptions(error: unknown, description?: string): HttpExceptionOptions {
		let causeError: Error | undefined;

		if (error instanceof Error) {
			causeError = error;
		} else {
			causeError = error ? new Error(JSON.stringify(error)) : undefined;
		}

		return { cause: causeError, description };
	}
}
