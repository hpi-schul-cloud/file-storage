import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { GlobalValidationPipe } from './pipe';

/**
 * The core module configures the cross-functional application behaviour by customizing error handling providing and logging.
 * Overrides/Configures global APP_INTERCEPTOR, APP_PIPE, APP_GUARD, APP_FILTER
 */
@Module({
	imports: [LoggerModule, ErrorModule],
	providers: [
		{
			provide: APP_PIPE,
			useClass: GlobalValidationPipe,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ClassSerializerInterceptor,
		},
		/*{ @TODO fix this interceptor
			provide: APP_INTERCEPTOR,
			useFactory: (configService: ConfigService) => new TimeoutInterceptor(configService),
			inject: [ConfigService],
		},*/
	],
	exports: [LoggerModule, ErrorModule],
})
export class CoreModule {}
