import { AnyEntity, EntityClass, MikroORM } from '@mikro-orm/mongodb';

/**
 * Test-Setup to make all entities available without a database connection.
 * @returns
 */
export const setupEntities = async (entities: EntityClass<AnyEntity>[]): Promise<MikroORM> => {
	const orm = await MikroORM.init({
		entities,
		dbName: ':memory:',
		connect: false,
		allowGlobalContext: true,
	});

	return orm;
};
