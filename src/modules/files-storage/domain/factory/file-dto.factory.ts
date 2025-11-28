import { Readable } from 'node:stream';
import { FileDto } from '../dto';

export class FileDtoFactory {
	public static create(name: string, data: Readable, mimeType: string, abortSignal?: AbortSignal): FileDto {
		const file = new FileDto({ name, data, mimeType, abortSignal });

		return file;
	}
}
