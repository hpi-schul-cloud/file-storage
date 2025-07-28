import { File } from '@infra/s3-client';
import { PassThrough, Readable } from 'stream';

export class FileDto implements File {
	constructor(file: FileDto) {
		this.name = file.name;
		this.data = file.data;
		this.mimeType = file.mimeType;
	}

	name: string;

	data: Readable;

	mimeType: string;

	public createPipedStream(): PassThrough {
		return this.data.pipe(new PassThrough());
	}
}
