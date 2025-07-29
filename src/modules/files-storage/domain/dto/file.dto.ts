import { File } from '@infra/s3-client';
import { PassThrough, Readable } from 'node:stream';

export class FileDto implements File {
	constructor(file: FileDto) {
		this.name = file.name;
		// Use PassThrough to ensure the stream can be read multiple times if needed
		// It is locked the original stream to prevent it from being consumed
		this.data = file.data.pipe(new PassThrough());
		this.mimeType = file.mimeType;
	}

	name: string;

	data: Readable;

	mimeType: string;
}
