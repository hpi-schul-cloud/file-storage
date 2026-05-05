import { ConfigurationModule } from '@infra/configuration';
import { DynamicModule, Module } from '@nestjs/common';
import axios from 'axios';
import { Agent } from 'node:http';
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
					const configuration = new Configuration({ basePath: config.authorizationApiUrl });

					const httpAgent = new Agent({ keepAlive: true, maxSockets: 20, keepAliveMsecs: 4000 });
					const axiosInstance = axios.create({ httpAgent });

					return new AuthorizationApi(configuration, config.authorizationApiUrl, axiosInstance);
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
