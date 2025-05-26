import { ConfigurationModule } from '@infra/configuration';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtValidationAdapter } from './adapter';
import { AuthGuardConfig } from './auth-guard.config';
import { JwtStrategy, XApiKeyStrategy } from './strategy';
import { XApiKeyConfig } from './x-api-key.config';

export enum AuthGuardOptions {
	JWT = 'jwt',
	X_API_KEY = 'x-api-key',
}

@Module({})
export class AuthGuardModule {
	public static register(options: AuthGuardOptions[]): DynamicModule {
		const providers: Provider[] = [JwtValidationAdapter];

		if (options.includes(AuthGuardOptions.JWT)) providers.push(JwtStrategy);

		if (options.includes(AuthGuardOptions.X_API_KEY)) providers.push(XApiKeyStrategy);

		return {
			module: AuthGuardModule,
			imports: [
				PassportModule,
				ConfigurationModule.register(AuthGuardConfig),
				ConfigurationModule.register(XApiKeyConfig),
			],
			providers,
			exports: [JwtValidationAdapter],
		};
	}
}
