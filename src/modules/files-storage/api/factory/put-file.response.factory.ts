import { FileRecord } from '@modules/files-storage/domain';
import { PutFileResponse } from '../dto/put-file.response';

export class PutFileResponseFactory {
	public static build(props: PutFileResponse): PutFileResponse {
		const fileInfo = new PutFileResponse(props);

		return fileInfo;
	}

	public static buildFromFileRecord(fileRecord: FileRecord): PutFileResponse {
		const response = this.build({
			LastModifiedTime: fileRecord.getProps().updatedAt.toISOString(),
		});

		return response;
	}
}
