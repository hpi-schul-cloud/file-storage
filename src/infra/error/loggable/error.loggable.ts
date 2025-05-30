import type { ErrorLogMessage, Loggable, LogMessageDataObject, ValidationErrorLogMessage } from '@infra/logger';
import { ValidationError } from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';
import util from 'util';
import { ApiValidationError } from '../domain';
import { ErrorUtils } from '../utils/error.utils';

export class ErrorLoggable implements Loggable {
	private readonly actualError: Error;

	constructor(
		private readonly error: unknown,
		private readonly data?: LogMessageDataObject
	) {
		if (this.error instanceof Error) {
			this.actualError = error as Error;
		} else {
			this.actualError = new Error(util.inspect(error));
		}
	}

	private readonly classValidatorMetadataStorage = getMetadataStorage();

	public getLogMessage(): ErrorLogMessage | ValidationErrorLogMessage {
		let logMessage: ErrorLogMessage | ValidationErrorLogMessage = {
			error: this.actualError,
			type: '',
			data: this.data,
		};

		if (this.actualError instanceof ApiValidationError) {
			logMessage = this.createLogMessageForValidationErrors(this.actualError);
		} else if (ErrorUtils.isNestHttpException(this.actualError)) {
			logMessage.type = 'Technical Error';
		} else {
			logMessage.type = 'Unhandled or Unknown Error';
		}

		return logMessage;
	}

	private createLogMessageForValidationErrors(error: ApiValidationError): ValidationErrorLogMessage {
		const errorMessages = error.validationErrors.map((e) => {
			const value = this.getPropertyValue(e);

			const message = `Wrong property value for '${e.property}' got '${value}' : ${JSON.stringify(e.constraints)}`;

			return message;
		});

		return {
			validationErrors: errorMessages,
			type: 'API Validation Error',
		};
	}

	private getPropertyValue(e: ValidationError): unknown {
		// we can only log a value if we can decide if it is privacy protected
		// that has to be done using the target metadata of class-validator (see @PrivacyProtect decorator)
		if (e.target && !this.isPropertyPrivacyProtected(e.target, e.property)) {
			return e.value;
		}

		return '######';
	}

	private isPropertyPrivacyProtected(target: Record<string, unknown>, property: string): boolean {
		const metadatas = this.classValidatorMetadataStorage.getTargetValidationMetadatas(
			target.constructor,
			'',
			true,
			true
		);

		const privacyProtected = metadatas.some(
			(validationMetadata) =>
				validationMetadata.propertyName === property && validationMetadata.context?.privacyProtected
		);

		return privacyProtected;
	}
}
