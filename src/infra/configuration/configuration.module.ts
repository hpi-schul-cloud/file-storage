import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigModuleOptions } from '@nestjs/config';
import { ConfigurationService } from './configuration.service';

const getEnvConfig = (): ConfigModuleOptions => {
	const envConfig = {
		isGlobal: true,
		cache: true,
		envFilePath: '.env',
		ignoreEnvFile: false,
	};

	if (process.env.NODE_ENV === 'test') {
		envConfig.envFilePath = '.env.test';
	}

	if (process.env.NODE_ENV === 'production') {
		envConfig.ignoreEnvFile = true;
	}

	return envConfig;
};

@Module({})
export class ConfigurationModule {
	public static register<T extends object>(Constructor: new () => T): DynamicModule {
		return {
			imports: [ConfigModule.forRoot(getEnvConfig())],
			providers: [
				ConfigurationService,
				{
					provide: Constructor,
					useFactory: (config: ConfigurationService): T => config.loadAndValidateConfigs(Constructor),
					inject: [ConfigurationService],
				},
			],
			exports: [ConfigurationService, Constructor],
			module: ConfigurationModule,
		};
	}
}
