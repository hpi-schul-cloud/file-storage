import { RpcError, RpcMessage } from '@infra/rabbitmq';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, InternalServerErrorException } from '@nestjs/common';
import { Response } from 'express';
import _ from 'lodash';
import { ApiValidationError, BusinessError, DomainErrorHandler } from '../domain';
import { ApiValidationErrorResponse, ErrorResponse } from '../dto';
import { ErrorUtils } from '../utils';

// We are receiving rmq instead of rpc and rmq is missing in context type.
// @nestjs/common export type ContextType = 'http' | 'ws' | 'rpc';
export enum UseableContextType {
	http = 'http',
	rpc = 'rpc',
	rmq = 'rmq',
}

@Catch()
export class GlobalErrorFilter<E extends RpcError> implements ExceptionFilter<E> {
	constructor(private readonly domainErrorHandler: DomainErrorHandler) {}

	public catch(error: E, host: ArgumentsHost): void | RpcMessage<undefined> {
		const contextType = host.getType<UseableContextType>();
		switch (contextType) {
			case UseableContextType.http:
				this.domainErrorHandler.execHttpContext(error, host.switchToHttp());

				return this.sendHttpResponse(error, host);
			case UseableContextType.rpc:
			case UseableContextType.rmq:
				this.domainErrorHandler.exec(error);

				return this.sendRpcResponse(error);
			default:
				this.domainErrorHandler.exec(error);

				return undefined;
		}
	}

	private sendHttpResponse(error: E, host: ArgumentsHost): void {
		const errorResponse = this.createErrorResponse(error);
		const httpArgumentHost = host.switchToHttp();
		const response = httpArgumentHost.getResponse<Response>();
		response.status(errorResponse.code).json(errorResponse);
	}

	private sendRpcResponse(error: E): RpcMessage<undefined> {
		const rpcError = { message: undefined, error };

		return rpcError;
	}

	private createErrorResponse(error: unknown): ErrorResponse {
		let response: ErrorResponse;

		if (ErrorUtils.isBusinessError(error)) {
			response = this.createErrorResponseForBusinessError(error);
		} else if (ErrorUtils.isNestHttpException(error)) {
			response = this.createErrorResponseForNestHttpException(error);
		} else {
			response = this.createErrorResponseForUnknownError();
		}

		return response;
	}

	private createErrorResponseForBusinessError(error: BusinessError): ErrorResponse {
		let response: ErrorResponse;

		if (error instanceof ApiValidationError) {
			response = new ApiValidationErrorResponse(error);
		} else {
			response = error.getResponse();
		}

		return response;
	}

	private createErrorResponseForNestHttpException(exception: HttpException): ErrorResponse {
		const code = exception.getStatus();
		const msg = exception.message ?? 'Some error occurred';
		const exceptionName = exception.constructor.name.replace('Loggable', '').replace('Exception', '');
		const type = _.snakeCase(exceptionName).toUpperCase();
		const title = _.startCase(exceptionName);

		return new ErrorResponse(type, title, msg, code);
	}

	private createErrorResponseForUnknownError(): ErrorResponse {
		const error = new InternalServerErrorException();
		const response = this.createErrorResponseForNestHttpException(error);

		return response;
	}
}
