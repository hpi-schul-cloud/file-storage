import { StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';

export class StreamableFileMapper {
	public static fromResponse(fileResponse: {
		data: Readable;
		contentType?: string;
		contentLength?: number;
	}): StreamableFile {
		const streamableFile = new StreamableFile(fileResponse.data, {
			type: fileResponse.contentType,
			length: fileResponse.contentLength,
		});

		return streamableFile;
	}
}
