import { ConfigurationModule } from '@infra/configuration';
import { Module } from '@nestjs/common';
import { utilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ErrorLogger } from './error-logger';
import { Logger } from './logger';
import { LOGGER_CONFIG_TOKEN, LoggerConfig } from './logger.config';

@Module({
	imports: [
		WinstonModule.forRootAsync({
			imports: [ConfigurationModule.register(LOGGER_CONFIG_TOKEN, LoggerConfig)],
			useFactory: (config: LoggerConfig) => {
				return {
					levels: winston.config.syslog.levels,
					level: config.LOGGER_LOG_LEVEL,
					exitOnError: config.LOGGER_EXIT_ON_ERROR,
					transports: [
						new winston.transports.Console({
							handleExceptions: true,
							handleRejections: true,
							format: winston.format.combine(
								winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
								winston.format.ms(),
								utilities.format.nestLike()
							),
						}),
					],
				};
			},
			inject: [LOGGER_CONFIG_TOKEN],
		}),
	],
	providers: [Logger, ErrorLogger],
	exports: [Logger, ErrorLogger],
})
export class LoggerModule {}
