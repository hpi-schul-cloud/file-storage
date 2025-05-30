import { EntityId } from '@shared/domain/types';
import { CreateJwtPayload, CurrentUserInterface } from '../interface';

export class JwtPayloadFactory {
	private static build(data: CreateJwtPayload): CreateJwtPayload {
		return data;
	}

	public static buildFromCurrentUser(currentUser: CurrentUserInterface): CreateJwtPayload {
		const data = {
			accountId: currentUser.accountId,
			userId: currentUser.userId,
			schoolId: currentUser.schoolId,
			roles: currentUser.roles,
			systemId: currentUser.systemId,
			support: false,
			supportUserId: undefined,
			isExternalUser: currentUser.isExternalUser,
		};

		const createJwtPayload = JwtPayloadFactory.build(data);

		return createJwtPayload;
	}

	public static buildFromSupportUser(currentUser: CurrentUserInterface, supportUserId: EntityId): CreateJwtPayload {
		const data = {
			accountId: currentUser.accountId,
			userId: currentUser.userId,
			schoolId: currentUser.schoolId,
			roles: currentUser.roles,
			systemId: currentUser.systemId,
			support: true,
			supportUserId,
			isExternalUser: currentUser.isExternalUser,
		};

		const createJwtPayload = JwtPayloadFactory.build(data);

		return createJwtPayload;
	}
}
