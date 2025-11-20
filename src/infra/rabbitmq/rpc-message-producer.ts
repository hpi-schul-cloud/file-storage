import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ErrorMapper } from './error.mapper';
import { RpcTimeoutException } from './loggable';
import { RpcMessage } from './rpc-message';

export abstract class RpcMessageProducer {
	constructor(
		protected readonly amqpConnection: AmqpConnection,
		protected readonly exchange: string,
		protected readonly timeout: number
	) {}

	protected async request<T>(event: string, payload: unknown): Promise<T> {
		try {
			const response = await this.amqpConnection.request<RpcMessage<T>>(this.createRequest(event, payload));

			this.checkError<T>(response);

			return response.message;
		} catch (error) {
			// https://github.com/golevelup/nestjs/issues/1083
			// right now there is no dedicated exception, so we have to check for the string value here
			if (error instanceof Error && error.message?.includes('Failed to receive response within timeout')) {
				throw new RpcTimeoutException(error);
			}
			throw error;
		}
	}

	// need to be fixed with https://ticketsystem.dbildungscloud.de/browse/BC-2984
	// mapRpcErrorResponseToDomainError should also removed with this ticket
	protected checkError<T>(response: RpcMessage<T>): void {
		const { error } = response;
		if (error) {
			const domainError = ErrorMapper.mapRpcErrorResponseToDomainError(error);
			throw domainError;
		}
	}

	protected createRequest(
		event: string,
		payload: unknown
	): {
		exchange: string;
		routingKey: string;
		payload: unknown;
		timeout: number;
		expiration?: number;
	} {
		// expiration should be greater than timeout
		const expiration = this.timeout > 0 ? this.timeout * 1.1 : undefined;

		return {
			exchange: this.exchange,
			routingKey: event,
			payload,
			timeout: this.timeout,
			expiration,
		};
	}
}
