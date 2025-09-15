import { ConfigurationModule } from '@infra/configuration';
import { Module } from '@nestjs/common';
import { WopiService } from './domain/wopi.service';
import { WopiConfig } from './wopi.config';

@Module({
	imports: [ConfigurationModule.register(WopiConfig)],
	providers: [WopiService],
	exports: [WopiService],
})
export class WopiModule {}
