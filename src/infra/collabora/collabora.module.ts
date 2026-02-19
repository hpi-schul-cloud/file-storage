import { ConfigurationModule } from '@infra/configuration';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { COLLABORA_CONFIG_TOKEN, CollaboraConfig } from './collabora.config';
import { CollaboraService } from './collabora.service';

@Module({
	imports: [ConfigurationModule.register(COLLABORA_CONFIG_TOKEN, CollaboraConfig), HttpModule],
	providers: [CollaboraService],
	exports: [CollaboraService],
})
export class CollaboraModule {}
