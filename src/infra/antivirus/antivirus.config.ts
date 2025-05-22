import { StringToBoolean, StringToNumber } from '@shared/transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class AntivirusConfig {
	// the antivirus service is enabled
	@IsBoolean()
	@StringToBoolean()
	ENABLE_FILE_SECURITY_CHECK = false;
	// base url for the file storage service
	@IsString()
	FILE_STORAGE_SERVICE_URL!: string;
	// rabbitmq exchange name for antivirus
	@IsString()
	ANTIVIRUS_EXCHANGE = 'antivirus';
	// rabbitmq routing key for antivirus
	@IsString()
	ANTIVIRUS_ROUTING_KEY = 'scan_file_v2';
	// IP of host to connect to TCP interface of antivirus service
	@IsString()
	@IsOptional()
	ANTIVIRUS_SERVICE_HOSTNAME!: string;
	// Port of host to use when connecting via TCP interface of antivirus service
	@IsNumber()
	@IsOptional()
	@StringToNumber()
	ANTIVIRUS_SERVICE_PORT!: number;
}
