import { StringToBoolean } from '@shared/transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DatabaseConfig {
	@IsString()
	public DB_URL!: string;

	@IsString()
	@IsOptional()
	public DB_USERNAME!: string;

	@IsString()
	@IsOptional()
	public DB_PASSWORD!: string;

	@IsBoolean()
	@StringToBoolean()
	public DB_ENSURE_INDEXES = true;

	@IsBoolean()
	@StringToBoolean()
	public DB_DEBUG = false;
}
