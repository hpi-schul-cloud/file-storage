import { ConfigurationModule } from '@infra/configuration';
import { defineConfig, EntityClass } from '@mikro-orm/mongodb';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DynamicModule, Module } from '@nestjs/common';
import { findOneOrFailHandler } from '@shared/error';
import { DatabaseConfig } from './database.config';

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
							clientUrl: config.DB_URL,
							password: config.DB_PASSWORD,
							user: config.DB_USERNAME,
							entities,
							ensureIndexes: config.DB_ENSURE_INDEXES,
							debug: config.DB_DEBUG,
						});
					},
					inject: [DatabaseConfig],
					imports: [ConfigurationModule.register(DatabaseConfig)],
				}),
			],
			providers: [],
		};
	}
}
