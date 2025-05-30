import { ObjectId } from '@mikro-orm/mongodb';
import _ from 'lodash';
import { AccountEntity } from '../entity/account.entity';
import { Permission } from '../entity/user-role-permissions';
import { UserEntity, UserProperties } from '../entity/user.entity';
import { accountFactory } from './account.factory';
import { userFactory } from './user.factory';

interface AccountParams {
	userId?: ObjectId;
}

export interface UserAndAccountParams extends UserProperties, AccountParams {}

export class UserAndAccountTestFactory {
	private static getUserParams(params: UserAndAccountParams): UserProperties {
		const userParams = _.pick(params, 'school', 'roles');

		return userParams;
	}

	private static buildAccount(user: UserEntity, params: UserAndAccountParams = {}): AccountEntity {
		const accountParams = _.pick(params, 'userId');
		const account = accountFactory.withUser(user).buildWithId(accountParams);

		return account;
	}

	public static buildStudent(
		params: UserAndAccountParams = {},
		additionalPermissions: Permission[] = []
	): {
		studentAccount: AccountEntity;
		studentUser: UserEntity;
	} {
		const user = userFactory
			.asStudent(additionalPermissions)
			.buildWithId(UserAndAccountTestFactory.getUserParams(params));
		const account = UserAndAccountTestFactory.buildAccount(user, params);

		return { studentAccount: account, studentUser: user };
	}

	public static buildTeacher(
		params: UserAndAccountParams = {},
		additionalPermissions: Permission[] = []
	): { teacherAccount: AccountEntity; teacherUser: UserEntity } {
		const user = userFactory
			.asTeacher(additionalPermissions)
			.buildWithId(UserAndAccountTestFactory.getUserParams(params));
		const account = UserAndAccountTestFactory.buildAccount(user, params);

		return { teacherAccount: account, teacherUser: user };
	}

	public static buildAdmin(
		params: UserAndAccountParams = {},
		additionalPermissions: Permission[] = []
	): { adminAccount: AccountEntity; adminUser: UserEntity } {
		const user = userFactory
			.asAdmin(additionalPermissions)
			.buildWithId(UserAndAccountTestFactory.getUserParams(params));
		const account = UserAndAccountTestFactory.buildAccount(user, params);

		return { adminAccount: account, adminUser: user };
	}

	public static buildSuperhero(
		params: UserAndAccountParams = {},
		additionalPermissions: Permission[] = []
	): { superheroAccount: AccountEntity; superheroUser: UserEntity } {
		const user = userFactory
			.asSuperhero(additionalPermissions)
			.buildWithId(UserAndAccountTestFactory.getUserParams(params));
		const account = UserAndAccountTestFactory.buildAccount(user, params);

		return { superheroAccount: account, superheroUser: user };
	}

	public static buildByRole(
		roleName: 'administrator' | 'teacher' | 'student',
		params: UserAndAccountParams = {},
		additionalPermissions: Permission[] = []
	): { account: AccountEntity; user: UserEntity } {
		const user = UserAndAccountTestFactory.buildUser(roleName, params, additionalPermissions);
		const account = UserAndAccountTestFactory.buildAccount(user, params);

		return { account, user };
	}

	private static buildUser(
		roleName: 'administrator' | 'teacher' | 'student',
		params: UserAndAccountParams = {},
		additionalPermissions: Permission[] = []
	): UserEntity {
		switch (roleName) {
			case 'administrator':
				return userFactory.asAdmin(additionalPermissions).buildWithId(UserAndAccountTestFactory.getUserParams(params));
			case 'teacher':
				return userFactory
					.asTeacher(additionalPermissions)
					.buildWithId(UserAndAccountTestFactory.getUserParams(params));
			case 'student':
				return userFactory
					.asStudent(additionalPermissions)
					.buildWithId(UserAndAccountTestFactory.getUserParams(params));
		}
	}
}
