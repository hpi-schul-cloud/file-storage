export interface RpcError extends Error {
	status?: number;
	message: string;
}
export interface RpcMessage<T> {
	message: T;
	error?: RpcError;
}
