import { StreamableFile } from '@nestjs/common';
import { type GetFileResponse } from '../../domain';

export class StreamableFileMapper {
	public static fromResponse(fileResponse: GetFileResponse): StreamableFile {
		// Always force a download: user-uploaded content must not be rendered inline on the application origin.
		const encodedFileName = encodeURIComponent(fileResponse.name);

		const streamableFile = new StreamableFile(fileResponse.data, {
			type: fileResponse.contentType,
			disposition: `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
			length: fileResponse.contentLength,
		});

		return streamableFile;
	}
}
