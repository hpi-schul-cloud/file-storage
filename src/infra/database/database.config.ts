import { Configuration } from '@infra/configuration';
import { StringToBoolean } from '@shared/transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export const DATABASE_CONFIG_TOKEN = 'DATABASE_CONFIG_TOKEN';

@Configuration()
export class DatabaseConfig {
	@IsString()
	DB_URL!: string;

	@IsString()
	@IsOptional()
	DB_USERNAME!: string;

	@IsString()
	@IsOptional()
	DB_PASSWORD!: string;

	@IsBoolean()
	@StringToBoolean()
	DB_ENSURE_INDEXES = true;

	@IsBoolean()
	@StringToBoolean()
	DB_DEBUG = false;
}
