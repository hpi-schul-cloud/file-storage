export interface CoreTimeoutInterceptorConfig {
	coreIncomingRequestTimeoutMs: number;
}

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface TimeoutInterceptorConfig extends CoreTimeoutInterceptorConfig {
	[key: string]: number;
}
