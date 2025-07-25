import { AccessUrl } from '@modules/files-storage/domain/access-url.vo';
import { AccessUrlResponse } from '../dto/wopi.response';

export class WopiResponseBuilder {
	public static buildAccessUrlResponse(onlineUrl: AccessUrl): AccessUrlResponse {
		const accessUrlResponse = new AccessUrlResponse(onlineUrl.url);

		return accessUrlResponse;
	}
}
