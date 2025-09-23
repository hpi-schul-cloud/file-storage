import { ErrorType } from '@modules/files-storage/domain';
import {
	BadRequestException,
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
	PayloadTooLargeException,
	UnauthorizedException,
} from '@nestjs/common';
import { WopiErrorResponseMapper } from './wopi-error-response.mapper';

describe('WopiErrorResponseMapper', () => {
	describe('when error is Unauthorized', () => {
		it('should return an UnauthorizedException', () => {
			const message = 'Error message';
			const error = new UnauthorizedException(message);

			const result = WopiErrorResponseMapper.mapErrorToWopiError(error);

			expect(result).toEqual(error);
			expect(result.message).toBe(message);
		});
	});

	describe('when error is NotFound', () => {
		it('should return a NotFoundException', () => {
			const message = 'Resource not found';
			const error = new NotFoundException(message);

			const result = WopiErrorResponseMapper.mapErrorToWopiError(error);

			expect(result).toEqual(error);
			expect(result.message).toBe(message);
		});
	});

	describe('when error is an error instance', () => {
		it('should return an InternalServerErrorException', () => {
			const message = 'Internal server error';
			const error = new Error(message);

			const result = WopiErrorResponseMapper.mapErrorToWopiError(error);

			expect(result).toEqual(new InternalServerErrorException(message, { cause: error }));
			expect(result.message).toBe(message);
		});
	});

	describe('when error is Forbidden', () => {
		it('should return a ForbiddenException', () => {
			const message = 'Access denied';
			const error = new ForbiddenException(message);

			const result = WopiErrorResponseMapper.mapErrorToWopiError(error);

			expect(result).toEqual(new UnauthorizedException(message, { cause: error }));
			expect(result.message).toBe(message);
		});
	});

	describe('when error is BadRequest', () => {
		describe('when error has FILE_TOO_BIG message', () => {
			it('should return a BadRequestException', () => {
				const message = ErrorType.FILE_TOO_BIG;
				const error = new BadRequestException(message);

				const result = WopiErrorResponseMapper.mapErrorToWopiError(error);

				expect(result).toEqual(new PayloadTooLargeException(message, { cause: error }));
				expect(result.message).toBe(message);
			});
		});

		describe('when error has other message', () => {
			it('should return a BadRequestException', () => {
				const message = 'Invalid request';
				const error = new BadRequestException(message);

				const result = WopiErrorResponseMapper.mapErrorToWopiError(error);

				expect(result).toEqual(new InternalServerErrorException(message, { cause: error }));
				expect(result.message).toBe(message);
			});
		});
	});
});
