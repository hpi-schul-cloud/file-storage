import { ConfigurationModule } from '@infra/configuration';
import { ClassSerializerInterceptor, DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TimeoutInterceptor, TimeoutInterceptorConfig } from './interceptor';
import { GlobalValidationPipe } from './pipe';

/**
 * The core module configures the cross-functional application behaviour by customizing error handling providing and logging.
 * Overrides/Configures global APP_INTERCEPTOR, APP_PIPE, APP_GUARD, APP_FILTER
 */
@Module({})
export class CoreModule {
	public static register<T extends object>(Constructor: new () => T): DynamicModule {
		return {
			module: CoreModule,
			imports: [ConfigurationModule.register(Constructor)],
			providers: [
				{
					provide: APP_PIPE,
					useClass: GlobalValidationPipe,
				},
				{
					provide: APP_INTERCEPTOR,
					useClass: ClassSerializerInterceptor,
				},
				{
					provide: APP_INTERCEPTOR,
					useFactory: (config: TimeoutInterceptorConfig): TimeoutInterceptor => new TimeoutInterceptor(config),
					inject: [Constructor],
				},
			],
		};
	}
}
