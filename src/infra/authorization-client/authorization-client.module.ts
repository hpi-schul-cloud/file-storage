import { ConfigurationModule } from '@infra/configuration';
import { DynamicModule, Module } from '@nestjs/common';
import axios from 'axios';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
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

					const agentOptions = { keepAlive: true, maxSockets: config.maxSockets, keepAliveMsecs: 10_000 };
					const isHttps = config.authorizationApiUrl.startsWith('https://');
					const axiosInstance = isHttps
						? axios.create({ httpsAgent: new HttpsAgent(agentOptions) })
						: axios.create({ httpAgent: new HttpAgent(agentOptions) });

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
