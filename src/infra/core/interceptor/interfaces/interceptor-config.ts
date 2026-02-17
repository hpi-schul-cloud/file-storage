export interface TimeoutInterceptorConfig {
	[key: string]: number;

	coreIncomingRequestTimeoutMs: number;
}
