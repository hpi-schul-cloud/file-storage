import { HttpException, HttpStatus, ValidationError } from '@nestjs/common';

export class ApiValidationError extends HttpException {
	constructor(readonly validationErrors: ValidationError[] = []) {
		super(
			{
				type: 'API_VALIDATION_ERROR',
				title: 'API Validation Error',
				message: 'API validation failed, see validationErrors for details',
			},
			HttpStatus.BAD_REQUEST,
		);
	}
}
