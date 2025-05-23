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

export class LoggerConfig {
	@IsEnum(LoggerLogLevel)
	public LOGGER_LOG_LEVEL!: LoggerLogLevel;

	@IsBoolean()
	@StringToBoolean()
	public LOGGER_EXIT_ON_ERROR = true;

	@IsBoolean()
	@StringToBoolean()
	public LOGGER_GLOBAL_REQUEST_LOGGING_ENABLED = false;
}
