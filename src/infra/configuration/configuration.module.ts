import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigModuleOptions } from '@nestjs/config';
import { Configuration } from './configuration.service';

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
				Configuration,
				{
					provide: Constructor,
					useFactory: (config: Configuration): T => config.getAllValidConfigsByType(Constructor),
					inject: [Configuration],
				},
			],
			exports: [Configuration, Constructor],
			module: ConfigurationModule,
		};
	}
}
