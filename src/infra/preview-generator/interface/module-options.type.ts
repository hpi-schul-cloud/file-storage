import { ModuleMetadata } from '@nestjs/common';

export interface PreviewModuleAsyncOptions {
	imports: ModuleMetadata['imports'];
}
