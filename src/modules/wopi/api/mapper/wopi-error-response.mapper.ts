import { ErrorType } from '@modules/files-storage/domain';
import {
	BadRequestException,
	ForbiddenException,
	PayloadTooLargeException,
	UnauthorizedException,
} from '@nestjs/common';

export class WopiErrorResponseMapper {
	public static mapErrorToWopiError(error: Error): Error {
		if (error instanceof ForbiddenException) {
			return new UnauthorizedException(error.message);
		}

		if (error instanceof BadRequestException && error.message === ErrorType.FILE_TOO_BIG) {
			return new PayloadTooLargeException(error.message);
		}

		return error;
	}
}
