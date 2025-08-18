import { FileRecord, WopiUser } from '@modules/files-storage/domain';
import { WopiFileInfoResponse } from '../dto';

export class WopiFileInfoResponseFactory {
	public static build(props: WopiFileInfoResponse): WopiFileInfoResponse {
		const fileInfo = new WopiFileInfoResponse(props);

		return fileInfo;
	}

	public static buildFromFileRecordAndUser(fileRecord: FileRecord, user: WopiUser): WopiFileInfoResponse {
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
