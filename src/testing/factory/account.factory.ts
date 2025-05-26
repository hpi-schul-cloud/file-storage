/* istanbul ignore file */
import { ObjectId } from '@mikro-orm/mongodb';
import { DeepPartial } from 'fishery';
import { AccountEntity } from '../entity/account.entity';
import { UserEntity } from '../entity/user.entity';
import { BaseFactory } from './base.factory';
class AccountFactory extends BaseFactory<AccountEntity, AccountEntity> {
	public withUser(user: UserEntity): this {
		if (!user.id) {
			throw new Error('User does not have an id.');
		}

		const params: DeepPartial<AccountEntity> = { userId: user.id };

		return this.params(params);
	}
}

// !!! important username should not be contain a space !!!
export const accountFactory = AccountFactory.define(AccountEntity, ({ sequence }) => {
	const _id = new ObjectId();

	return {
		_id,
		id: _id.toHexString(),
		username: `account#${sequence}@example.tld`,
		userId: new ObjectId(),
	};
});
