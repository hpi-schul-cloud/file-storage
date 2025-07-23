import { EntityId } from '@shared/domain/types';
import { AccessUrl } from '../access-url.vo';
import { WopiAccessToken } from '../wopi-access-token.vo';

export class AccessUrlFactory {
	public static build(url: string): AccessUrl {
		return new AccessUrl(url);
	}

	public static buildFromParams(
		onlineEditorUrl: string,
		wopiSrc: string,
		fileRecordId: EntityId,
		accessToken: WopiAccessToken
	): AccessUrl {
		const onlineUrl = new URL(onlineEditorUrl);
		onlineUrl.searchParams.set('WOPISrc', `${wopiSrc}/${fileRecordId}`);
		onlineUrl.searchParams.set('access_token', accessToken.token);

		const accessUrl = this.build(onlineUrl.toString());

		return accessUrl;
	}
}
