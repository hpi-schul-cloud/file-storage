import { type PassThrough } from 'node:stream';
import { type StorageType } from '../storage-paths.const';
import { type FileDto } from './file.dto';

export class PassThroughFileDto implements FileDto {
	constructor(file: PassThroughFileDto) {
		this.name = file.name;
		this.data = file.data;
		this.mimeType = file.mimeType;
		this.abortSignal = file.abortSignal;
		this.streamCompletion = file.streamCompletion;
		this.fileSize = file.fileSize;
		this.storageType = file.storageType;
	}

	name: string;

	data: PassThrough;

	mimeType: string;

	abortSignal?: AbortSignal;

	streamCompletion?: Promise<void>;

	fileSize: number;

	storageType: StorageType;
}
