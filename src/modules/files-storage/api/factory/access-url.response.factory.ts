import { AccessUrl } from '@modules/files-storage/domain/access-url.vo';
import { AccessUrlResponse } from '../dto/access-url.response';

export class AccessUrlResponseFactory {
	public static build(props: AccessUrlResponse): AccessUrlResponse {
		return new AccessUrlResponse(props);
	}

	public static buildFromAccessUrl(accessUrl: AccessUrl): AccessUrlResponse {
		return new AccessUrlResponse({ onlineUrl: accessUrl.url });
	}
}
