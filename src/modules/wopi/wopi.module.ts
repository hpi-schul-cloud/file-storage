import { ConfigurationModule } from '@infra/configuration';
import { FilesStorageModule } from '@modules/files-storage';
import { Module } from '@nestjs/common';
import { WopiService } from './domain';
import { WOPI_CONFIG_TOKEN, WopiConfig } from './wopi.config';

@Module({
	imports: [ConfigurationModule.register(WOPI_CONFIG_TOKEN, WopiConfig), FilesStorageModule],
	providers: [WopiService],
	exports: [WopiService],
})
export class WopiModule {}
