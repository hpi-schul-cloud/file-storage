import { EntityId } from '@shared/domain/types';
import { WopiPayload } from '../wopi-payload.vo';

export class WopiPayloadFactory {
	public static build(props: WopiPayload): WopiPayload {
		return new WopiPayload(props);
	}

	public static buildFromParams(
		fileRecordId: EntityId,
		canWrite: boolean,
		userDisplayName: string,
		userId: EntityId
	): WopiPayload {
		const payload = new WopiPayload({
			fileRecordId,
			canWrite,
			userDisplayName,
			userId,
		});

		return payload;
	}

	public static buildFromUnknownObject(unknownObject: object): WopiPayload {
		const payload = new WopiPayload(unknownObject as WopiPayload);

		return payload;
	}
}
