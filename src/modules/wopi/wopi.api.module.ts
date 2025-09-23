import { AuthGuardModule, AuthGuardOptions } from '@infra/auth-guard';
import { AuthorizationClientModule } from '@infra/authorization-client';
import { CollaboraModule } from '@infra/collabora';
import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { Module } from '@nestjs/common';
import { WopiController, WopiUc } from './api';
import { WopiConfig } from './wopi.config';
import { WopiModule } from './wopi.module';
import { ConfigurationModule } from '@infra/configuration';

const imports = [
	WopiModule,
	ErrorModule,
	LoggerModule,
	CollaboraModule,
	AuthGuardModule.register([AuthGuardOptions.JWT]),
	AuthorizationClientModule.register(),
	ConfigurationModule.register(WopiConfig),
];
const providers = [WopiUc];
const controllers = [WopiController];

@Module({
	imports,
	providers,
	controllers,
	exports: [],
})
export class WopiApiModule {}
