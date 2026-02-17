import { AuthGuardModule, AuthGuardOptions } from '@infra/auth-guard';
import { AuthorizationClientModule } from '@infra/authorization-client';
import { CollaboraModule } from '@infra/collabora';
import { ConfigurationModule } from '@infra/configuration';
import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { Module } from '@nestjs/common';
import { WopiController, WopiUc } from './api';
import { WOPI_CONFIG_TOKEN, WOPI_PUBLIC_API_CONFIG_TOKEN, WopiConfig, WopiPublicApiConfig } from './wopi.config';
import { WopiModule } from './wopi.module';

const imports = [
	WopiModule,
	ErrorModule,
	LoggerModule,
	CollaboraModule,
	AuthGuardModule.register([AuthGuardOptions.JWT]),
	AuthorizationClientModule.register(),
	ConfigurationModule.register(WOPI_CONFIG_TOKEN, WopiConfig),
	ConfigurationModule.register(WOPI_PUBLIC_API_CONFIG_TOKEN, WopiPublicApiConfig),
];
const providers = [WopiUc];
const controllers = [WopiController];

@Module({
	imports,
	providers,
	controllers,
	exports: [ConfigurationModule.register(WOPI_PUBLIC_API_CONFIG_TOKEN, WopiPublicApiConfig)],
})
export class WopiApiModule {}
