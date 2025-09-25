import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToClassFromExist } from 'class-transformer';
import { validateSync } from 'class-validator';
import { WithConfigurationDecorator } from './configuration.decorator';

/**
 * Service to load and validate configuration classes decorated with @Configuration()
 * and properties decorated with @ConfigProperty() to take values from environment variables by other names.
 * @see Configuration
 * @see ConfigProperty
 */
@Injectable()
export class ConfigurationService {
	constructor(private readonly configService: ConfigService) {}

	public loadAndValidateConfigs<T extends object>(Constructor: new () => T): T {
		const configInstance = this.initializeAndLoadConfig<T>(Constructor);

		const validatedConfig = this.validate(configInstance);

		return validatedConfig;
	}

	private initializeAndLoadConfig<T>(Constructor: new () => T): T {
		let configInstance = new Constructor() as T & WithConfigurationDecorator;

		if (!configInstance.getConfigKeys || typeof configInstance.getConfigKeys !== 'function') {
			throw new Error(`The class ${Constructor.name} is not decorated with @Configuration()`);
		}

		const configKeys = configInstance.getConfigKeys();

		configKeys.forEach((key) => {
			const value = this.configService.get(key);
			if (value !== undefined && value !== null) {
				(configInstance as WithConfigurationDecorator)[key] = value;
			}
		});

		configInstance = plainToClassFromExist(configInstance, { ...configInstance });

		return configInstance;
	}

	private validate<T extends object>(validatedConfig: T): T {
		const errors = validateSync(validatedConfig, { skipMissingProperties: false });

		if (errors.length > 0) {
			throw new Error(errors.toString());
		}

		return validatedConfig;
	}
}
