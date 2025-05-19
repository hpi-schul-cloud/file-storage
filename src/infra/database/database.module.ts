import { ConfigurationModule } from '@infra/configuration';
import { Dictionary, EntityClass, IPrimaryKey } from '@mikro-orm/core';
import { defineConfig } from '@mikro-orm/mongodb';
import { MikroOrmModule, MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { DynamicModule, Module, NotFoundException } from '@nestjs/common';
import { DatabaseConfig } from './database.config';

const defaultMikroOrmOptions: MikroOrmModuleSyncOptions = {
	findOneOrFailHandler: (entityName: string, where: Dictionary | IPrimaryKey) =>
		new NotFoundException(`The requested ${entityName}: ${JSON.stringify(where)} has not been found.`),
};

@Module({})
export class DatabaseModule {
	public static forRoot(entities: EntityClass<unknown>[]): DynamicModule {
		return {
			module: DatabaseModule,
			imports: [
				MikroOrmModule.forRootAsync({
					useFactory: (config: DatabaseConfig) => {
						return defineConfig({
							findOneOrFailHandler: defaultMikroOrmOptions.findOneOrFailHandler,
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
