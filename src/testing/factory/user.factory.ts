/* istanbul ignore file */
import { ObjectId } from '@mikro-orm/mongodb';
import { DeepPartial } from 'fishery';
import _ from 'lodash';
import { RoleEntity, RoleName } from '../entity/role.entity';
import {
	adminPermissions,
	Permission,
	studentPermissions,
	superheroPermissions,
	teacherPermissions,
	userPermissions,
} from '../entity/user-role-permissions';
import { UserEntity, UserProperties } from '../entity/user.entity';
import { EntityFactory } from './entity.factory';
import { roleFactory } from './role.factory';

class UserFactory extends EntityFactory<UserEntity, UserProperties> {
	public withRoleByName(name: RoleName): this {
		const params: DeepPartial<UserProperties> = { roles: [roleFactory.buildWithId({ name })] };

		return this.params(params);
	}

	public withRole(role: RoleEntity): this {
		const params: DeepPartial<UserProperties> = { roles: [role] };

		return this.params(params);
	}

	public asStudent(additionalPermissions: Permission[] = []): this {
		const permissions = _.union(userPermissions, studentPermissions, additionalPermissions);
		const role = roleFactory.buildWithId({ permissions, name: RoleName.STUDENT });

		const params: DeepPartial<UserProperties> = { roles: [role], school: new ObjectId() };

		return this.params(params);
	}

	public asTeacher(additionalPermissions: Permission[] = []): this {
		const permissions = _.union(userPermissions, teacherPermissions, additionalPermissions);
		const role = roleFactory.buildWithId({ permissions, name: RoleName.TEACHER });

		const params: DeepPartial<UserProperties> = { roles: [role], school: new ObjectId() };

		return this.params(params);
	}

	public asAdmin(additionalPermissions: Permission[] = []): this {
		const permissions = _.union(userPermissions, adminPermissions, additionalPermissions);
		const role = roleFactory.buildWithId({ permissions, name: RoleName.ADMINISTRATOR });

		const params: DeepPartial<UserProperties> = { roles: [role], school: new ObjectId() };

		return this.params(params);
	}

	public asSuperhero(additionalPermissions: Permission[] = []): this {
		const permissions = _.union(userPermissions, superheroPermissions, additionalPermissions);
		const role = roleFactory.buildWithId({ permissions, name: RoleName.SUPERHERO });

		const params: DeepPartial<UserProperties> = { roles: [role], school: new ObjectId() };

		return this.params(params);
	}
}

export const userFactory = UserFactory.define(UserEntity, ({}) => {
	const result = {
		roles: [],
		school: new ObjectId(),
	};

	return result;
});
