import { ConfigurationModule } from '@infra/configuration';
import { defineConfig, EntityClass } from '@mikro-orm/mongodb';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DynamicModule, Module } from '@nestjs/common';
import { DATABASE_CONFIG_TOKEN, DatabaseConfig } from './database.config';
import { findOneOrFailHandler } from './database.not-found.error';

@Module({})
export class DatabaseModule {
	public static forRoot(entities: EntityClass<unknown>[]): DynamicModule {
		return {
			module: DatabaseModule,
			imports: [
				MikroOrmModule.forRootAsync({
					useFactory: (config: DatabaseConfig) => {
						return defineConfig({
							findOneOrFailHandler,
							clientUrl: config.dbUrl,
							password: config.dbPassword,
							user: config.dbUsername,
							entities,
							ensureIndexes: config.dbEnsureIndexes,
							debug: config.dbDebug,
						});
					},
					inject: [DATABASE_CONFIG_TOKEN],
					imports: [ConfigurationModule.register(DATABASE_CONFIG_TOKEN, DatabaseConfig)],
				}),
			],
			providers: [],
		};
	}
}
