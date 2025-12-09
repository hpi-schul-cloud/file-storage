import { Readable } from 'node:stream';
import { FileDto } from '../dto';
import { awaitStreamCompletion, duplicateStream } from '../service/stream.utils';
import { StreamFileSizeObserver } from './stream-file-size.observer';

export class FileDtoFactory {
	public static create(name: string, stream: Readable, mimeType: string, abortSignal?: AbortSignal): FileDto {
		const fileSizeObserver = StreamFileSizeObserver.create(stream);
		const streamCompletion = awaitStreamCompletion(stream, abortSignal);
		const file = new FileDto({
			name,
			data: stream,
			mimeType,
			abortSignal,
			fileSizeObserver,
			streamCompletion,
		});

		return file;
	}

	public static copyFromFileDto(sourceFile: FileDto, mimeType: string, newFileName?: string): FileDto {
		const data = duplicateStream(sourceFile.data);
		const file = new FileDto({
			name: newFileName ?? sourceFile.name,
			data,
			mimeType,
			abortSignal: sourceFile.abortSignal,
			fileSizeObserver: sourceFile.fileSizeObserver,
			streamCompletion: sourceFile.streamCompletion,
		});

		return file;
	}
}
