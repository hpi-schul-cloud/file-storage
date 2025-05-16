import { InjectionToken, ModuleMetadata } from '@nestjs/common';
import { S3Config } from './index';
export const S3_CLIENT_OPTIONS = 'S3_CLIENT_OPTIONS';

export interface S3ClientModuleFactory {
	createS3ModuleOptions: () => Promise<S3Config> | S3Config;
}

export interface S3ClientModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	injectionToken: string;
	inject?: InjectionToken[];
	useFactory?: (...args: never[]) => Promise<S3Config> | S3Config;
}
