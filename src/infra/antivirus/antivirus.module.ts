import { ConfigurationModule } from '@infra/configuration';
import { RabbitMQWrapperModule } from '@infra/rabbitmq';
import { DynamicModule, Module } from '@nestjs/common';
import NodeClam from 'clamscan';
import { ANTIVIRUS_CONFIG_TOKEN, AntivirusConfig, AntivirusExchange } from './antivirus.config';
import { AntivirusService } from './antivirus.service';
import { AntivirusServiceOptions } from './interfaces';

@Module({})
export class AntivirusModule {
	public static forRoot(): DynamicModule {
		return {
			module: AntivirusModule,
			imports: [
				ConfigurationModule.register(ANTIVIRUS_CONFIG_TOKEN, AntivirusConfig),
				RabbitMQWrapperModule.forRoot([AntivirusExchange]),
			],
			providers: [
				AntivirusService,
				{
					provide: 'ANTIVIRUS_SERVICE_OPTIONS',
					useFactory: (config: AntivirusConfig): AntivirusServiceOptions => {
						return {
							enabled: config.enableFileSecurityCheck,
							filesServiceBaseUrl: config.fileStorageServiceUrl,
							exchange: AntivirusExchange,
							routingKey: config.antivirusRoutingKey,
						};
					},
					inject: [ANTIVIRUS_CONFIG_TOKEN],
				},
				{
					provide: NodeClam,
					useFactory: (config: AntivirusConfig): Promise<NodeClam> => {
						const isLocalhost = config.antivirusServiceHostname === 'localhost';

						return new NodeClam().init({
							debugMode: isLocalhost,
							clamdscan: {
								host: config.antivirusServiceHostname,
								port: config.antivirusServicePort,
								bypassTest: true,
								localFallback: false,
							},
						});
					},
					inject: [ANTIVIRUS_CONFIG_TOKEN],
				},
			],

			exports: [AntivirusService],
		};
	}
}
