import { ModuleMetadata } from '@nestjs/common';

export interface PreviewModuleConfig {
	NEST_LOG_LEVEL: string;
	INCOMING_REQUEST_TIMEOUT: number;
}

export interface PreviewModuleAsyncOptions {
	imports: ModuleMetadata['imports'];
}
