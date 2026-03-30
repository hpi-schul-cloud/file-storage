import { PassThrough } from 'node:stream';
import { FileDto, PassThroughFileDto } from '../dto';
import { StorageType } from '../file-record.do';
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
