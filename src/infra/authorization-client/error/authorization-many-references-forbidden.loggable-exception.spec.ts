import { AuthorizationBodyParamsReferenceType } from '../authorization-api-client';
import { ReferenceAuthorizationInfo } from '../vo';
import { AuthorizationManyReferencesForbiddenLoggableException } from './authorization-many-references-forbidden.loggable-exception';

describe('AuthorizationManyReferencesForbiddenLoggableException', () => {
	describe('getLogMessage', () => {
		const setup = () => {
			const references: ReferenceAuthorizationInfo[] = [
				{
					referenceType: AuthorizationBodyParamsReferenceType.COURSES,
					referenceId: 'someReferenceId',
					isAuthorized: false,
				},
			];
			const expectedData = {
				references: JSON.stringify(
					references.map((reference) => ({
						referenceType: reference.referenceType,
						referenceId: reference.referenceId,
					}))
				),
			};

			const exception = new AuthorizationManyReferencesForbiddenLoggableException(references);

			return {
				exception,
				expectedData,
			};
		};

		it('should log the correct message', () => {
			const { exception, expectedData } = setup();

			const result = exception.getLogMessage();

			expect(result).toEqual({
				type: 'FORBIDDEN_EXCEPTION',
				stack: expect.any(String),
				data: expectedData,
			});
		});
	});
});
