import { File } from '@infra/s3-client';
import { Readable } from 'node:stream';
import { StorageDirectory } from '../file-record.do';

export class FileDto implements File {
	constructor(file: FileDto) {
		this.name = file.name;
		this.data = file.data;
		this.mimeType = file.mimeType;
		this.abortSignal = file.abortSignal;
		this.storageDirectory = file.storageDirectory;
	}

	name: string;

	data: Readable;

	mimeType: string;

	abortSignal?: AbortSignal;

	storageDirectory?: StorageDirectory;
}
