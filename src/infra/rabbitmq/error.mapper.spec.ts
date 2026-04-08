import { RpcError } from '@infra/rabbitmq';
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	InternalServerErrorException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ErrorMapper } from './error.mapper';

describe('ErrorMapper', () => {
	describe('mapErrorToDomainError', () => {
		it('Should map any 400 error to BadRequestException.', () => {
			const errorText = 'BadRequestException ABC';
			const e = new BadRequestException(errorText);
			const json = Object.assign({}, e) as unknown as RpcError;

			const result = ErrorMapper.mapRpcErrorResponseToDomainError(json);

			expect(result).toStrictEqual(new BadRequestException(errorText));
		});

		it('Should map 403 error response to ForbiddenException.', () => {
			const errorText = 'ForbiddenException ABC';
			const rpcResponseError = Object.assign({}, new ForbiddenException(errorText)) as unknown as RpcError;

			const result = ErrorMapper.mapRpcErrorResponseToDomainError(rpcResponseError);

			expect(result).toStrictEqual(new ForbiddenException(errorText));
		});

		it('Should map 500 error response to InternalServerErrorException.', () => {
			const errorText = 'InternalServerErrorException ABC';
			const json = Object.assign({}, new InternalServerErrorException(errorText)) as unknown as RpcError;

			const result = ErrorMapper.mapRpcErrorResponseToDomainError(json);

			expect(result).toStrictEqual(new InternalServerErrorException(errorText));
		});

		it('Should map 422 error response to UnprocessableEntityException.', () => {
			const errorText = 'UnprocessableEntityException ABC';
			const json = Object.assign({}, new UnprocessableEntityException(errorText)) as unknown as RpcError;

			const result = ErrorMapper.mapRpcErrorResponseToDomainError(json);

			expect(result).toStrictEqual(new UnprocessableEntityException(errorText));
		});

		it('Should map unknown error code to InternalServerErrorException.', () => {
			const errorText = 'Any error text';
			const json = Object.assign({}, new ConflictException(errorText)) as unknown as RpcError;

			const result = ErrorMapper.mapRpcErrorResponseToDomainError(json);

			expect(result).toStrictEqual(new InternalServerErrorException('Internal Server Error Exception'));
			// @ts-expect-error cause is always unknown
			expect(result.cause?.message).toContain(errorText);
		});
	});
});
