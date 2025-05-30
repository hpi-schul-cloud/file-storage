import { BadRequestException } from '@nestjs/common';
import { ErrorUtils } from './error.utils';

describe('ErrorUtils', () => {
	describe('isNestHttpException', () => {
		it('should return true if error is NestHttpException', () => {
			const error = new BadRequestException();

			const result = ErrorUtils.isNestHttpException(error);

			expect(result).toBe(true);
		});

		it('should return true if error is not NestHttpException', () => {
			const error = new Error();

			const result = ErrorUtils.isNestHttpException(error);

			expect(result).toBe(false);
		});
	});

	describe('createHttpExceptionOptions', () => {
		it('should return HttpExceptionOptions if error is instance of Error', () => {
			const error = new BadRequestException();

			const result = ErrorUtils.createHttpExceptionOptions(error);

			const expectedResult = { cause: error };

			expect(result).toEqual(expectedResult);
		});

		it('should return HttpExceptionOptions if error is a string', () => {
			const error = 'test string';

			const result = ErrorUtils.createHttpExceptionOptions(error);

			const expectedResult = { cause: new Error(JSON.stringify(error)) };

			expect(result).toEqual(expectedResult);
		});

		it('should return HttpExceptionOptions if error is a number', () => {
			const error = 1;

			const result = ErrorUtils.createHttpExceptionOptions(error);

			const expectedResult = { cause: new Error(JSON.stringify(error)) };

			expect(result).toEqual(expectedResult);
		});

		it('should return HttpExceptionOptions if error is a object', () => {
			const error = { a: 1 };

			const result = ErrorUtils.createHttpExceptionOptions(error);

			const expectedResult = { cause: new Error(JSON.stringify(error)) };

			expect(result).toEqual(expectedResult);
		});
	});
});
