import { ObjectId } from '@mikro-orm/mongodb';
import { BaseFactory } from '@testing/factory/base.factory';
import { CurrentUserInterface } from '../interface';

class CurrentUser implements CurrentUserInterface {
	userId: string;

	roles: string[];

	schoolId: string;

	accountId: string;

	systemId: string;

	isExternalUser: boolean;

	support: boolean;

	supportUserId?: string;

	constructor(data: CurrentUserInterface) {
		this.userId = data.userId;
		this.roles = data.roles;
		this.schoolId = data.schoolId;
		this.accountId = data.accountId;
		this.systemId = data.systemId ?? '';
		this.isExternalUser = data.isExternalUser;
		this.support = false;
		this.supportUserId = data.supportUserId;
	}
}

class CurrentUserFactory extends BaseFactory<CurrentUser, CurrentUserInterface> {
	public withRole(role: string): this {
		const params = { roles: [role] };

		return this.params(params);
	}

	public withRoleAdmin(): this {
		return this.withRole('admin');
	}

	public withRoleStudent(): this {
		return this.withRole('student');
	}

	public withRoleTeacher(): this {
		return this.withRole('teacher');
	}
}

export const currentUserFactory = CurrentUserFactory.define(CurrentUser, () => {
	return {
		userId: new ObjectId().toHexString(),
		roles: [],
		schoolId: new ObjectId().toHexString(),
		accountId: new ObjectId().toHexString(),
		systemId: new ObjectId().toHexString(),
		isExternalUser: false,
		support: false,
		supportUserId: undefined,
	};
});
