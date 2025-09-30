import { FileRecord } from '@modules/files-storage/domain';
import { WopiFileInfoResponse } from '../dto';
import { WopiUser } from './wopi-user.factory';

export class WopiFileInfoResponseFactory {
	public static build(props: WopiFileInfoResponse): WopiFileInfoResponse {
		const fileInfo = new WopiFileInfoResponse(props);

		return fileInfo;
	}

	public static buildFromFileRecordAndUser(
		fileRecord: FileRecord,
		user: WopiUser,
		wopiPostMessageOrigin: string
	): WopiFileInfoResponse {
		const response = this.build({
			Size: fileRecord.getProps().size,
			IsAdminUser: false,
			PostMessageOrigin: wopiPostMessageOrigin,
			UserId: user.id,
			UserFriendlyName: user.userName,
			BaseFileName: fileRecord.getName(),
			UserCanWrite: user.canWrite,
			OwnerId: fileRecord.getProps().creatorId,
			LastModifiedTime: fileRecord.getContentLastModifiedAt()?.toISOString(),
		});

		return response;
	}
}
