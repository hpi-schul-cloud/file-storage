import { LoggerModule } from '@infra/logger';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DomainErrorHandler } from './domain';
import { GlobalErrorFilter } from './filter/global-error.filter';

/**
 * Overrides the default global Exception Filter of NestJS provided by @APP_FILTER
 */
@Module({
	imports: [LoggerModule],
	providers: [
		{
			provide: APP_FILTER,
			useClass: GlobalErrorFilter,
		},
		DomainErrorHandler,
	],
	exports: [DomainErrorHandler],
})
export class ErrorModule {}
