import { Readable } from 'node:stream';
import { FileDto } from '../dto';
import { convertToPipableStream } from '../service/stream.utils';

export class FileDtoFactory {
	public static create(name: string, stream: Readable, mimeType: string, abortSignal?: AbortSignal): FileDto {
		const data = convertToPipableStream(stream);
		const file = new FileDto({ name, data, mimeType, abortSignal });

		return file;
	}
}
