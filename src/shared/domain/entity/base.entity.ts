import { Entity, OptionalProps, PrimaryKey, Property, SerializedPrimaryKey } from '@mikro-orm/core';
import { ObjectId } from '@mikro-orm/mongodb';
import type { AuthorizableObject } from '../domain-object';

@Entity({ abstract: true })
export abstract class BaseEntity implements AuthorizableObject {
	@PrimaryKey()
	_id!: ObjectId;

	@SerializedPrimaryKey()
	id!: string;
}

/**
 * Describes the properties available for entities when used as @IdentifiedReference
 */
export type BaseEntityReference = 'id' | '_id';

@Entity({ abstract: true })
export abstract class BaseEntityWithTimestamps<Optional = never> extends BaseEntity {
	[OptionalProps]?: Optional | 'createdAt' | 'updatedAt';

	@Property({ type: Date })
	createdAt = new Date();

	@Property({ type: Date, onUpdate: () => new Date() })
	updatedAt = new Date();
}

// These fields are explicitly ignored when updating an entity. See base.do.repo.ts.
export const baseEntityProperties = ['id', '_id', 'updatedAt', 'createdAt'];
