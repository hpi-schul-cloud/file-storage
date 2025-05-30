import { findOneOrFailHandler } from '@infra/database/database.not-found.error';
import { defineConfig, EntityClass, EntityManager } from '@mikro-orm/mongodb';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DynamicModule, Module, OnModuleDestroy } from '@nestjs/common';
import _ from 'lodash';

const getDbName = (): string => _.times(20, () => _.random(35).toString(36)).join('');

@Module({})
export class MongoMemoryDatabaseModule implements OnModuleDestroy {
	constructor(private readonly em: EntityManager) {}

	public static forRoot(entities: EntityClass<unknown>[]): DynamicModule {
		const dbName = getDbName();
		const clientUrl = `${process.env.MONGO_TEST_URI}/${dbName}`;

		return {
			module: MongoMemoryDatabaseModule,
			imports: [
				MikroOrmModule.forRootAsync({
					useFactory: () => {
						return defineConfig({
							findOneOrFailHandler,
							allowGlobalContext: true,
							clientUrl,
							entities,
							debug: true,
						});
					},
				}),
			],
		};
	}

	public async onModuleDestroy(): Promise<void> {
		await this.em.getConnection().close(true);
	}
}
