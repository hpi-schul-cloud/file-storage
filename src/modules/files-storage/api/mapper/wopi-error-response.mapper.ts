import { ErrorType } from '@modules/files-storage/domain';
import {
	BadRequestException,
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
		} else if (error instanceof BadRequestException && error.message === ErrorType.FILE_TOO_BIG) {
			return new PayloadTooLargeException(error.message, { cause: error });
		} else if (error instanceof NotFoundException) {
			return error;
		} else if (error instanceof UnauthorizedException) {
			return error;
		} else {
			return new InternalServerErrorException(error.message, { cause: error });
		}
	}
}
