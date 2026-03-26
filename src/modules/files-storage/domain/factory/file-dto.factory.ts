import { Readable } from 'node:stream';
import { FileDto } from '../dto';
import { StorageDirectory } from '../file-record.do';

export class FileDtoFactory {
	public static create(
		name: string,
		stream: Readable,
		mimeType: string,
		abortSignal?: AbortSignal,
		storageDirectory?: StorageDirectory
	): FileDto {
		const file = new FileDto({
			name,
			data: stream,
			mimeType,
			abortSignal,
			storageDirectory,
		});

		return file;
	}
}
