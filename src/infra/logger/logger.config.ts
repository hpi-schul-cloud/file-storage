import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToBoolean } from '@shared/transformer';
import { IsBoolean, IsEnum } from 'class-validator';

export enum LoggerLogLevel {
	emerg = 'emerg',
	alert = 'alert',
	crit = 'crit',
	error = 'error',
	warning = 'warning',
	notice = 'notice',
	info = 'info',
	debug = 'debug',
}

export const LOGGER_CONFIG_TOKEN = 'LOGGER_CONFIG_TOKEN';

@Configuration()
export class LoggerConfig {
	@ConfigProperty('LOGGER_LOG_LEVEL')
	@IsEnum(LoggerLogLevel)
	loggerLogLevel!: LoggerLogLevel;

	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty('LOGGER_EXIT_ON_ERROR')
	loggerExitOnError = true;

	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty('LOGGER_GLOBAL_REQUEST_LOGGING_ENABLED')
	loggerGlobalRequestLoggingEnabled = false;
}
