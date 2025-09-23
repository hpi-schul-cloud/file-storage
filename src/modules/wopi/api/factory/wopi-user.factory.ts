import { EntityId } from '@shared/domain/types';
import { WopiPayload } from '../../domain';

export interface WopiUser {
	id: EntityId;
	userName: string;
	canWrite: boolean;
}

export class WopiUserFactory {
	public static build(wopiPayload: WopiPayload): WopiUser {
		const user = {
			id: wopiPayload.userId,
			userName: wopiPayload.userDisplayName,
			canWrite: wopiPayload.canWrite,
		};

		return user;
	}
}
