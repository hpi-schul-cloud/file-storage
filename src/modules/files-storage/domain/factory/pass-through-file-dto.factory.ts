import { PassThrough } from 'node:stream';
import { FileDto, PassThroughFileDto } from '../dto';
import { awaitStreamCompletion } from '../utils';
import { StreamFileSizeObserver } from './stream-file-size.observer';

export class PassThroughFileDtoFactory {
	public static create(
		sourceFile: FileDto,
		passThrough: PassThrough,
		mimeType: string,
		newFileName?: string
	): PassThroughFileDto {
		const streamCompletion = awaitStreamCompletion(passThrough, sourceFile.abortSignal);
		const file = new PassThroughFileDto({
			name: newFileName ?? sourceFile.name,
			data: passThrough,
			mimeType,
			abortSignal: sourceFile.abortSignal,
			streamCompletion,
			fileSize: 0,
		});

		StreamFileSizeObserver.observe(file);

		return file;
	}
}
