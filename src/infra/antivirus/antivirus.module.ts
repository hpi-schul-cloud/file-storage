import { ConfigurationModule } from '@infra/configuration';
import { DynamicModule, Module } from '@nestjs/common';
import NodeClam from 'clamscan';
import { AntivirusConfig } from './antivirus.config';
import { AntivirusService } from './antivirus.service';
import { AntivirusServiceOptions } from './interfaces';

@Module({})
export class AntivirusModule {
	public static forRoot(): DynamicModule {
		return {
			module: AntivirusModule,
			imports: [ConfigurationModule.register(AntivirusConfig)],
			providers: [
				AntivirusService,
				{
					provide: 'ANTIVIRUS_SERVICE_OPTIONS',
					useFactory: (config: AntivirusConfig): AntivirusServiceOptions => {
						return {
							enabled: config.ENABLE_FILE_SECURITY_CHECK,
							filesServiceBaseUrl: config.FILE_STORAGE_SERVICE_URL,
							exchange: config.ANTIVIRUS_EXCHANGE,
							routingKey: config.ANTIVIRUS_ROUTING_KEY,
						};
					},
					inject: [AntivirusConfig],
				},
				{
					provide: NodeClam,
					useFactory: (config: AntivirusConfig): Promise<NodeClam> => {
						const isLocalhost = config.ANTIVIRUS_SERVICE_HOSTNAME === 'localhost';

						return new NodeClam().init({
							debugMode: isLocalhost,
							clamdscan: {
								host: config.ANTIVIRUS_SERVICE_HOSTNAME,
								port: config.ANTIVIRUS_SERVICE_PORT,
								bypassTest: true,
								localFallback: false,
							},
						});
					},
					inject: [AntivirusConfig],
				},
			],

			exports: [AntivirusService],
		};
	}
}
