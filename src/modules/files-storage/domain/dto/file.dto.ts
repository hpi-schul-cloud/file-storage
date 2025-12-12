import { File } from '@infra/s3-client';
import { Readable } from 'node:stream';
import { StreamFileSizeObserver } from '../factory';

export class FileDto implements File {
	constructor(file: FileDto) {
		this.name = file.name;
		this.data = file.data;
		this.mimeType = file.mimeType;
		this.abortSignal = file.abortSignal;
		this.streamCompletion = file.streamCompletion;
		this.fileSizeObserver = file.fileSizeObserver;
	}

	name: string;

	data: Readable;

	mimeType: string;

	abortSignal?: AbortSignal;

	streamCompletion?: Promise<void>;

	fileSizeObserver?: StreamFileSizeObserver;
}
