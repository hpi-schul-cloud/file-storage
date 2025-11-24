import { RpcTimeoutException } from './rpc-timeout.exception';

describe(RpcTimeoutException.name, () => {
	describe('WHEN getLogMessage is called', () => {
		const setup = () => {
			const error = new Error('RPC call timed out');

			return { error };
		};

		it('should return error log message with error', () => {
			const { error } = setup();

			const exception = new RpcTimeoutException(error);

			const result = exception.getLogMessage();

			expect(result).toEqual({
				type: 'RPC_TIMEOUT',
				stack: exception.stack,
				error,
			});
		});

		it('should return error log message without error', () => {
			const exception = new RpcTimeoutException();

			const result = exception.getLogMessage();

			expect(result).toEqual({
				type: 'RPC_TIMEOUT',
				stack: exception.stack,
				error: undefined,
			});
		});
	});

	describe('WHEN constructor is called', () => {
		it('should create exception with error message', () => {
			const error = new Error('RPC call timed out');
			const exception = new RpcTimeoutException(error);

			expect(exception.message).toBe('RPC call timed out');
		});

		it('should create exception without error message when no error provided', () => {
			const exception = new RpcTimeoutException();

			expect(exception.message).toBe('');
		});
	});
});
