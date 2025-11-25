import { ErrorUtils } from '@infra/error/utils';
import { RpcError } from '@infra/rabbitmq';
import {
	BadRequestException,
	ForbiddenException,
	InternalServerErrorException,
	UnprocessableEntityException,
} from '@nestjs/common';

export class ErrorMapper {
	public static mapRpcErrorResponseToDomainError(
		errorObj: RpcError
	): BadRequestException | ForbiddenException | InternalServerErrorException {
		let error: BadRequestException | ForbiddenException | InternalServerErrorException;
		if (errorObj.status === 400) {
			error = new BadRequestException(errorObj.message);
		} else if (errorObj.status === 403) {
			error = new ForbiddenException(errorObj.message);
		} else if (errorObj.status === 500) {
			error = new InternalServerErrorException(errorObj.message);
		} else if (errorObj.status === 422) {
			error = new UnprocessableEntityException(errorObj.message);
		} else {
			error = new InternalServerErrorException(null, ErrorUtils.createHttpExceptionOptions(errorObj));
		}

		return error;
	}
}
