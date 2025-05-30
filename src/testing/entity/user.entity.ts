import { Entity, ObjectId, Property } from '@mikro-orm/mongodb';
import { BaseEntity } from '@shared/domain/entity';
import { RoleEntity } from './role.entity';

export interface UserProperties {
	school?: ObjectId;
	roles?: RoleEntity[];
}

@Entity()
export class UserEntity extends BaseEntity {
	@Property()
	school!: ObjectId;

	@Property()
	roles!: RoleEntity[];
}
