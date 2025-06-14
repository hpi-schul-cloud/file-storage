import { currentUserFactory } from '@infra/auth-guard/testing/currentuser.factory';
import { ObjectId } from '@mikro-orm/mongodb';
import { CreateJwtPayload } from '../interface';
import { JwtPayloadFactory } from './jwt.factory';

describe('JwtPayloadFactory', () => {
	describe('buildFromCurrentUser', () => {
		it('should map current user to create jwt payload', () => {
			const currentUser = currentUserFactory.build();

			const createJwtPayload = JwtPayloadFactory.buildFromCurrentUser(currentUser);

			expect(createJwtPayload).toMatchObject<CreateJwtPayload>({
				accountId: currentUser.accountId,
				systemId: currentUser.systemId,
				roles: currentUser.roles,
				schoolId: currentUser.schoolId,
				userId: currentUser.userId,
				support: false,
				isExternalUser: false,
			});
		});
	});

	describe('buildFromSupportUser', () => {
		it('should map current user to create jwt payload', () => {
			const currentUser = currentUserFactory.build();
			const supportUserId = new ObjectId().toHexString();

			const createJwtPayload = JwtPayloadFactory.buildFromSupportUser(currentUser, supportUserId);

			expect(createJwtPayload).toMatchObject<CreateJwtPayload>({
				accountId: currentUser.accountId,
				systemId: currentUser.systemId,
				roles: currentUser.roles,
				schoolId: currentUser.schoolId,
				userId: currentUser.userId,
				support: true,
				supportUserId,
				isExternalUser: false,
			});
		});
	});
});
