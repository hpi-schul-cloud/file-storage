import { ConfigurationModule } from '@infra/configuration';
import { DynamicModule, Module } from '@nestjs/common';
import { AuthorizationApi, Configuration, ConfigurationParameters } from './authorization-api-client';
import { AuthorizationClientAdapter } from './authorization-client.adapter';
import { AUTHORIZATION_CONFIG_TOKEN, AuthorizationConfig } from './authorization.config';

export interface AuthorizationClientConfig extends ConfigurationParameters {
	basePath: string;
}

@Module({})
export class AuthorizationClientModule {
	public static register(): DynamicModule {
		const providers = [
			AuthorizationClientAdapter,
			{
				provide: AuthorizationApi,
				useFactory: (config: AuthorizationConfig): AuthorizationApi => {
					const configuration = new Configuration({ basePath: config.AUTHORIZATION_API_URL });

					return new AuthorizationApi(configuration);
				},
				inject: [AUTHORIZATION_CONFIG_TOKEN],
			},
		];

		return {
			module: AuthorizationClientModule,
			imports: [ConfigurationModule.register(AUTHORIZATION_CONFIG_TOKEN, AuthorizationConfig)],
			providers,
			exports: [AuthorizationClientAdapter],
		};
	}
}
