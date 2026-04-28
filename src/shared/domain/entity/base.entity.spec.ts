import { Entity, MikroORM, ObjectId } from '@mikro-orm/mongodb';
import { setupEntities } from '@testing/database';
import { BaseEntity } from './base.entity';

@Entity()
class TestEntity extends BaseEntity {}

describe('BaseEntity', () => {
	let orm: MikroORM;
	beforeAll(async () => {
		orm = await setupEntities([TestEntity]);
	});

	afterAll(async () => {
		await orm.close(true);
	});

	describe('when _id property is set to ObjectId', () => {
		it('should serialize the ObjectId to the id property', () => {
			const testEntity = new TestEntity();
			testEntity._id = new ObjectId();
			orm.em.persist(testEntity);

			expect(testEntity.id).toEqual(testEntity._id.toHexString());
		});
	});

	describe('when id property is set to serialized ObjectId', () => {
		it('should wrap the serialized id to the _id property', () => {
			const testEntity = new TestEntity();
			testEntity.id = new ObjectId().toHexString();
			orm.em.persist(testEntity);

			expect(testEntity._id).toBeInstanceOf(ObjectId);
			expect(testEntity._id.toHexString()).toEqual(testEntity.id);
		});
	});
});
