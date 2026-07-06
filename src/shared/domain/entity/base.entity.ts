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

@Entity({ abstract: true })
export abstract class BaseEntityWithTimestamps<Optional = never> extends BaseEntity {
	[OptionalProps]?: Optional | 'createdAt' | 'updatedAt';

	@Property({ type: Date })
	createdAt = new Date();

	@Property({ type: Date, onUpdate: () => new Date() })
	updatedAt = new Date();
}
