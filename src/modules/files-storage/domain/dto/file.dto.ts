import { File } from '@infra/s3-client';
import { Readable } from 'node:stream';
import { StorageType } from '../storage-paths.const';

export class FileDto implements File {
	constructor(file: FileDto) {
		this.name = file.name;
		this.data = file.data;
		this.mimeType = file.mimeType;
		this.abortSignal = file.abortSignal;
		this.storageType = file.storageType;
	}

	name: string;

	data: Readable;

	mimeType: string;

	abortSignal?: AbortSignal;

	storageType: StorageType;
}
