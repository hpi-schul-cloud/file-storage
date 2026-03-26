import { PassThrough } from 'node:stream';
import { FileDto, PassThroughFileDto } from '../dto';
import { awaitStreamCompletion } from '../utils';
import { StorageDirectory } from '../file-record.do';

export class PassThroughFileDtoFactory {
	public static create(
		sourceFile: FileDto,
		passThrough: PassThrough,
		mimeType: string,
		newFileName?: string,
		storageDirectory?: StorageDirectory
	): PassThroughFileDto {
		const streamCompletion = awaitStreamCompletion(passThrough, sourceFile.abortSignal);
		const file = new PassThroughFileDto({
			name: newFileName ?? sourceFile.name,
			data: passThrough,
			mimeType,
			abortSignal: sourceFile.abortSignal,
			streamCompletion,
			fileSize: 0,
			storageDirectory: storageDirectory ?? sourceFile.storageDirectory,
		});

		return file;
	}
}
