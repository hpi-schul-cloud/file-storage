/* istanbul ignore file */
import { ObjectId } from '@mikro-orm/mongodb';
import { DeepPartial } from 'fishery';
import { AccountEntity } from '../entity/account.entity';
import { UserEntity } from '../entity/user.entity';
import { BaseFactory } from './base.factory';

export const defaultTestPassword = 'DummyPasswd!1';
export const defaultTestPasswordHash = '$2a$10$/DsztV5o6P5piW2eWJsxw.4nHovmJGBA.QNwiTmuZ/uvUc40b.Uhu';
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
		password: defaultTestPasswordHash,
		userId: new ObjectId(),
	};
});
