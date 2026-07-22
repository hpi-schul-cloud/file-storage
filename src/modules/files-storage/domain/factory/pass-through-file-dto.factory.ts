import { type PassThrough } from 'node:stream';
import { type FileDto, PassThroughFileDto } from '../dto';
import { type StorageType } from '../storage-paths.const';
import { awaitStreamCompletion } from '../utils';

export class PassThroughFileDtoFactory {
	public static create(
		sourceFile: FileDto,
		passThrough: PassThrough,
		mimeType: string,
		newFileName?: string,
		storageType?: StorageType
	): PassThroughFileDto {
		const streamCompletion = awaitStreamCompletion(passThrough, sourceFile.abortSignal);
		const file = new PassThroughFileDto({
			name: newFileName ?? sourceFile.name,
			data: passThrough,
			mimeType,
			abortSignal: sourceFile.abortSignal,
			streamCompletion,
			fileSize: 0,
			storageType: storageType ?? sourceFile.storageType,
		});

		return file;
	}
}
