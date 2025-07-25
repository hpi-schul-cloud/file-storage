import { FileRecord, WopiUser } from '@modules/files-storage/domain';
import { WopiCheckFileInfoResponse } from '../dto';

export class WopiCheckFileInfoResponseFactory {
	public static build(props: WopiCheckFileInfoResponse): WopiCheckFileInfoResponse {
		const fileInfo = new WopiCheckFileInfoResponse(props);

		return fileInfo;
	}

	public static buildFromFileRecordAndUser(fileRecord: FileRecord, user: WopiUser): WopiCheckFileInfoResponse {
		const response = this.build({
			Size: fileRecord.getProps().size,
			UserId: user.id,
			UserFriendlyName: user.userName,
			BaseFileName: fileRecord.getName(),
			UserCanWrite: user.canWrite,
			OwnerId: fileRecord.getProps().creatorId,
			LastModifiedTime: fileRecord.getProps().updatedAt.toISOString(),
		});

		return response;
	}
}
