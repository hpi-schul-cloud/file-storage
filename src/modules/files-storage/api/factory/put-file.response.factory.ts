import { FileRecord } from '@modules/files-storage/domain';
import { InternalServerErrorException } from '@nestjs/common';
import { PutFileResponse } from '../dto/put-file.response';

export class PutFileResponseFactory {
	public static build(props: PutFileResponse): PutFileResponse {
		const fileInfo = new PutFileResponse(props);

		return fileInfo;
	}

	public static buildFromFileRecord(fileRecord: FileRecord): PutFileResponse {
		const contentLastModifiedAt = fileRecord.getContentLastModifiedAt();

		if (!contentLastModifiedAt) {
			throw new InternalServerErrorException('FileRecord does not have content last modified time.');
		}

		const response = this.build({
			LastModifiedTime: contentLastModifiedAt.toISOString(),
		});

		return response;
	}
}
