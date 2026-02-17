import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToBoolean, StringToNumber } from '@shared/transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export const AntivirusExchange = 'antivirus';
export const ANTIVIRUS_CONFIG_TOKEN = 'ANTIVIRUS_CONFIG_TOKEN';

@Configuration()
export class AntivirusConfig {
	// the antivirus service is enabled
	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty('ENABLE_FILE_SECURITY_CHECK')
	enableFileSecurityCheck = false;
	// base url for the file storage service
	@IsString()
	@ConfigProperty('FILE_STORAGE_SERVICE_URL')
	fileStorageServiceUrl!: string;
	// rabbitmq routing key for antivirus
	@IsString()
	@ConfigProperty('ANTIVIRUS_ROUTING_KEY')
	antivirusRoutingKey = 'scan_file_v2';
	// IP of host to connect to TCP interface of antivirus service
	@IsString()
	@IsOptional()
	@ConfigProperty('ANTIVIRUS_SERVICE_HOSTNAME')
	antivirusServiceHostname!: string;
	// Port of host to use when connecting via TCP interface of antivirus service
	@IsNumber()
	@IsOptional()
	@StringToNumber()
	@ConfigProperty('ANTIVIRUS_SERVICE_PORT')
	antivirusServicePort!: number;
}
