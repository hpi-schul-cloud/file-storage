import { ConfigurationModule } from '@infra/configuration';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CollaboraConfig } from './colabora.config';
import { CollaboraService } from './colabora.service';

@Module({
	imports: [ConfigurationModule.register(CollaboraConfig), HttpModule],
	providers: [CollaboraService],
	exports: [CollaboraService],
})
export class CollaboraModule {}
