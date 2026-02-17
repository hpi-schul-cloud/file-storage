import { Configuration } from '@infra/configuration';
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
	@IsEnum(LoggerLogLevel)
	LOGGER_LOG_LEVEL!: LoggerLogLevel;

	@IsBoolean()
	@StringToBoolean()
	LOGGER_EXIT_ON_ERROR = true;

	@IsBoolean()
	@StringToBoolean()
	LOGGER_GLOBAL_REQUEST_LOGGING_ENABLED = false;
}
