import { ApiValidationError } from '@infra/error';
import { ErrorLogMessage } from '@infra/logger';
import { BadRequestException, ValidationError } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { PrivacyProtect } from '@shared/validator';
import { ErrorLoggable } from './error.loggable';

class UserDto {
	@ApiProperty()
	username!: string;

	@ApiProperty()
	email!: string;

	@PrivacyProtect()
	@ApiProperty()
	password!: string;
}

describe('ErrorLoggable', () => {
	describe('getLogMessage', () => {
		describe('when error is an ApiValidationError', () => {
			const setup = () => {
				const validationError1: ValidationError = {
					property: 'username',
					target: new UserDto(),
					value: '',
					constraints: { username: 'must not be empty' },
				};
				const validationError2 = {
					property: 'email',
					// missing target
					value: 'john-example.com',
					constraints: { email: 'must be a valid email address' },
				};
				const validationError3 = {
					property: 'password', // privacy protected property
					target: new UserDto(),
					value: 'john-example.com',
					constraints: { password: 'must contain at least one number' },
				};
				const error = new ApiValidationError([validationError1, validationError2, validationError3]);
				const errorLoggable = new ErrorLoggable(error);
				const expectedMessage = {
					validationErrors: [
						'Wrong property value for \'username\' got \'\' : {"username":"must not be empty"}',
						'Wrong property value for \'email\' got \'######\' : {"email":"must be a valid email address"}',
						'Wrong property value for \'password\' got \'######\' : {"password":"must contain at least one number"}',
					],
					type: 'API Validation Error',
				};

				return { errorLoggable, expectedMessage };
			};

			it('should return ErrorLogMessage with appropriate content', () => {
				const { errorLoggable, expectedMessage } = setup();

				const message = errorLoggable.getLogMessage();

				expect(message).toEqual(expectedMessage);
			});
		});

		describe('when error is a NestHttpException', () => {
			const setup = () => {
				const error = new BadRequestException();
				const errorLoggable = new ErrorLoggable(error);
				const expectedMessage = {
					error,
					type: 'Technical Error',
				};

				return { errorLoggable, expectedMessage };
			};

			it('should return ErrorLogMessage with appropriate error type', () => {
				const { errorLoggable, expectedMessage } = setup();

				const message = errorLoggable.getLogMessage();

				expect(message).toEqual(expectedMessage);
			});
		});

		describe('when error is a generic error', () => {
			const setup = () => {
				const error = new Error();
				const errorLoggable = new ErrorLoggable(error);
				const expectedMessage = {
					error,
					type: 'Unhandled or Unknown Error',
				};

				return { errorLoggable, expectedMessage };
			};

			it('should return ErrorLogMessage with appropriate error type', () => {
				const { errorLoggable, expectedMessage } = setup();

				const message = errorLoggable.getLogMessage();

				expect(message).toEqual(expectedMessage);
			});
		});

		describe('when error is of unknown type', () => {
			it('should return ErrorLogMessage with appropriate error type', () => {
				const errorLoggable = new ErrorLoggable('something broke');

				const message = errorLoggable.getLogMessage() as ErrorLogMessage;
				expect(message.data).toBeUndefined();
				expect(message.error).toBeInstanceOf(Error);
				expect(message.type).toBe('Unhandled or Unknown Error');
			});
		});
	});
});
