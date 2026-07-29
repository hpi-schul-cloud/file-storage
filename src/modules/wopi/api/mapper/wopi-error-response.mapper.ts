import {
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
	PayloadTooLargeException,
	UnauthorizedException,
} from '@nestjs/common';

export class WopiErrorResponseMapper {
	public static mapErrorToWopiError(error: Error): Error {
		if (error instanceof ForbiddenException) {
			return new UnauthorizedException(error.message, { cause: error });
		} else if (error instanceof PayloadTooLargeException) {
			return error;
		} else if (error instanceof NotFoundException) {
			return error;
		} else if (error instanceof UnauthorizedException) {
			return error;
		} else {
			return new InternalServerErrorException(error.message, { cause: error });
		}
	}
}
