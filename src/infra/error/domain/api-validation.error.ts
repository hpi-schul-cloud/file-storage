import { HttpStatus, ValidationError } from '@nestjs/common';
import { BusinessError } from './business.error';

export class ApiValidationError extends BusinessError {
	constructor(public readonly validationErrors: ValidationError[] = []) {
		super(
			{
				type: 'API_VALIDATION_ERROR',
				title: 'API Validation Error',
				message: 'API validation failed, see validationErrors for details',
			},
			HttpStatus.BAD_REQUEST
		);
	}
}
