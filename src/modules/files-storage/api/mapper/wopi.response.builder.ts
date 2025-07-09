import { FileRecord, WopiUser } from '../../domain';
import { WopiCheckFileInfoResponse } from '../dto/wopi.response';

export class WopiResponseBuilder {
	public static buildCheckFileInfo(fileRecord: FileRecord, user: WopiUser): WopiCheckFileInfoResponse {
		const response = new WopiCheckFileInfoResponse(fileRecord, user);

		return response;
	}
}
