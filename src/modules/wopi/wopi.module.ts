import { ConfigurationModule } from '@infra/configuration';
import { FilesStorageModule } from '@modules/files-storage';
import { Module } from '@nestjs/common';
import { WopiService } from './domain/wopi.service';
import { WopiConfig } from './wopi.config';

@Module({
	imports: [ConfigurationModule.register(WopiConfig), FilesStorageModule],
	providers: [WopiService],
	exports: [WopiService],
})
export class WopiModule {}
