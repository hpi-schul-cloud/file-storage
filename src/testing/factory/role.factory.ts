import { RoleEntity, RoleName, RoleProperties } from '../entity/role.entity';
import { EntityFactory } from './entity.factory';

class RoleFactory extends EntityFactory<RoleEntity, RoleProperties> {}

export const roleFactory = RoleFactory.define(RoleEntity, ({ sequence }) => {
	return {
		name: `role${sequence}` as RoleName,
		permissions: [],
	};
});
