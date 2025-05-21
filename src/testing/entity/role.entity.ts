import { Entity, Property } from '@mikro-orm/mongodb';
import { BaseEntity } from '@shared/domain/entity';
import { Permission } from './user-role-permissions';

export enum RoleName {
	ADMINISTRATOR = 'administrator',
	STUDENT = 'student',
	SUPERHERO = 'superhero',
	TEACHER = 'teacher',
	USER = 'user',
}

export interface RoleProperties {
	permissions: Permission[];
	name: RoleName;
}

@Entity()
export class RoleEntity extends BaseEntity {
	@Property()
	name!: RoleName;

	@Property()
	permissions!: Permission[];
}
