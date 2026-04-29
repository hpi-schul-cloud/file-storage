import { CurrentUserInterface } from '@infra/auth-guard/interface';
import { ObjectId } from '@mikro-orm/mongodb';
import { BaseFactory } from '@testing/factory/base.factory';

export class CurrentUser implements CurrentUserInterface {
	public userId: string;

	public roles: string[];

	public schoolId: string;

	public accountId: string;

	public systemId: string;

	public isExternalUser: boolean;

	public support: boolean;

	public supportUserId?: string;

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
