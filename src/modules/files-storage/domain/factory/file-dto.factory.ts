import { PassThrough, Readable } from 'node:stream';
import { FileDto } from '../dto';
import { awaitStreamCompletion } from '../service/stream.utils';
import { StreamFileSizeObserver } from './stream-file-size.observer';

export class FileDtoFactory {
	public static create(name: string, stream: Readable, mimeType: string, abortSignal?: AbortSignal): FileDto {
		const file = new FileDto({
			name,
			data: stream,
			mimeType,
			abortSignal,
		});

		return file;
	}

	public static copyFromFileDto(
		sourceFile: FileDto,
		passThrough: PassThrough,
		mimeType: string,
		newFileName?: string
	): FileDto {
		const fileSizeObserver = StreamFileSizeObserver.create(passThrough);
		const streamCompletion = awaitStreamCompletion(passThrough, sourceFile.abortSignal);
		const file = new FileDto({
			name: newFileName ?? sourceFile.name,
			data: passThrough,
			mimeType,
			abortSignal: sourceFile.abortSignal,
			fileSizeObserver,
			streamCompletion,
		});

		return file;
	}
}
