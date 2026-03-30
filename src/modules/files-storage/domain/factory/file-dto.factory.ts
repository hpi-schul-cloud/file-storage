import { Readable } from 'node:stream';
import { FileDto } from '../dto';
import { StorageType } from '../file-record.do';

export class FileDtoFactory {
	public static create(
		name: string,
		stream: Readable,
		mimeType: string,
		abortSignal?: AbortSignal,
		storageType?: StorageType
	): FileDto {
		const file = new FileDto({
			name,
			data: stream,
			mimeType,
			abortSignal,
			storageType,
		});

		return file;
	}
}
