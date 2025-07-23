import { EntityId } from '@shared/domain/types';
import { AccessUrl } from '../access-url.vo';
import { WopiAccessToken } from '../wopi-access-token.vo';
import { WopiPayload } from '../wopi-payload.vo';

export class WopiBuilder {
	public static buildAccessUrl(
		onlineEditorUrl: string,
		wopiSrc: string,
		fileRecordId: EntityId,
		accessToken: WopiAccessToken
	): AccessUrl {
		const onlineUrl = new URL(onlineEditorUrl);
		onlineUrl.searchParams.set('WOPISrc', `${wopiSrc}/${fileRecordId}`);
		onlineUrl.searchParams.set('access_token', accessToken.token);

		const url = new AccessUrl(onlineUrl.toString());

		return url;
	}

	public static buildWopiPayload(
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

	public static buildWopiPayloadFromResponse(props: unknown): WopiPayload {
		const payload = new WopiPayload(props as WopiPayload);

		return payload;
	}

	public static buildAccessToken(token: string): WopiAccessToken {
		const accessToken = new WopiAccessToken(token);

		return accessToken;
	}
}
