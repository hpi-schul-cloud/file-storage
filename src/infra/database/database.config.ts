import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToBoolean } from '@shared/transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export const DATABASE_CONFIG_TOKEN = 'DATABASE_CONFIG_TOKEN';

@Configuration()
export class DatabaseConfig {
	@IsString()
	@ConfigProperty('DB_URL')
	dbUrl!: string;

	@IsString()
	@IsOptional()
	@ConfigProperty('DB_USERNAME')
	dbUsername!: string;

	@IsString()
	@IsOptional()
	@ConfigProperty('DB_PASSWORD')
	dbPassword!: string;

	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty('DB_ENSURE_INDEXES')
	dbEnsureIndexes = true;

	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty('DB_DEBUG')
	dbDebug = false;
}
