import { PassThrough, Readable } from 'node:stream';
import { FileDto, PassThroughFileDto } from '../dto';
import { awaitStreamCompletion } from '../service/stream.utils';

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
	): PassThroughFileDto {
		const streamCompletion = awaitStreamCompletion(passThrough, sourceFile.abortSignal);
		const file = new PassThroughFileDto({
			name: newFileName ?? sourceFile.name,
			data: passThrough,
			mimeType,
			abortSignal: sourceFile.abortSignal,
			streamCompletion,
		});

		return file;
	}
}
