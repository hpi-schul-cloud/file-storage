import {
	AuthorizationBodyParamsReferenceType,
	AuthorizationContextParamsAction,
	AuthorizationManyReferencesBodyParams,
} from '../authorization-api-client';
import { AuthorizationErrorLoggableException } from './authorization-error.loggable-exception';
import { AuthorizationManyReferencesErrorLoggableException } from './authorization-many-references-error.loggable-exception';

describe('AuthorizationErrorLoggableException', () => {
	describe('when error is instance of Error', () => {
		describe('getLogMessage', () => {
			const setup = () => {
				const params: AuthorizationManyReferencesBodyParams = {
					references: [
						{
							context: {
								action: AuthorizationContextParamsAction.READ,
								requiredPermissions: [],
							},
							referenceType: AuthorizationBodyParamsReferenceType.COURSES,
							referenceId: 'someReferenceId',
						},
					],
				};

				const error = new Error('testError');
				const exception = new AuthorizationManyReferencesErrorLoggableException(error, params);

				const references = params.references.map((reference) => ({
					action: reference.context.action,
					referenceType: reference.referenceType,
					referenceId: reference.referenceId,
					requiredPermissions: reference.context.requiredPermissions.join(','),
				}));
				const expectedData = { references: JSON.stringify(references) };

				return {
					params,
					error,
					exception,
					expectedData,
				};
			};

			it('should log the correct message', () => {
				const { error, exception, expectedData } = setup();

				const result = exception.getLogMessage();

				expect(result).toEqual({
					type: AuthorizationErrorLoggableException.name,
					error,
					stack: expect.any(String),
					data: expectedData,
				});
			});
		});
	});

	describe('when error is NOT instance of Error', () => {
		describe('getLogMessage', () => {
			const setup = () => {
				const params: AuthorizationManyReferencesBodyParams = {
					references: [
						{
							context: {
								action: AuthorizationContextParamsAction.READ,
								requiredPermissions: [],
							},
							referenceType: AuthorizationBodyParamsReferenceType.COURSES,
							referenceId: 'someReferenceId',
						},
					],
				};

				const error = { code: '123', message: 'testError' };
				const exception = new AuthorizationManyReferencesErrorLoggableException(error, params);

				const references = params.references.map((reference) => ({
					action: reference.context.action,
					referenceType: reference.referenceType,
					referenceId: reference.referenceId,
					requiredPermissions: reference.context.requiredPermissions.join(','),
				}));
				const expectedData = { references: JSON.stringify(references) };

				return {
					params,
					error,
					exception,
					expectedData,
				};
			};

			it('should log the correct message', () => {
				const { error, exception, expectedData } = setup();

				const result = exception.getLogMessage();

				expect(result).toEqual({
					type: AuthorizationErrorLoggableException.name,
					error: new Error(JSON.stringify(error)),
					stack: expect.any(String),
					data: expectedData,
				});
			});
		});
	});
});
