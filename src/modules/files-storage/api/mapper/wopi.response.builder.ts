import { AccessUrl } from '@modules/files-storage/domain/access-url.vo';
import { FileRecord, WopiUser } from '../../domain';
import { AccessUrlResponse, WopiCheckFileInfoResponse } from '../dto/wopi.response';

export class WopiResponseBuilder {
	public static buildCheckFileInfoResponse(fileRecord: FileRecord, user: WopiUser): WopiCheckFileInfoResponse {
		const response = new WopiCheckFileInfoResponse(fileRecord, user);

		return response;
	}

	public static buildAccessUrlResponse(onlineUrl: AccessUrl): AccessUrlResponse {
		const accessUrlResponse = new AccessUrlResponse(onlineUrl.url);

		return accessUrlResponse;
	}
}
