import { Readable } from 'node:stream';
import { FileDto } from '../dto';

export class FileDtoBuilder {
	public static build(name: string, data: Readable, mimeType: string): FileDto {
		const file = new FileDto({ name, data, mimeType });

		return file;
	}
}
