import { AxiosResponse } from 'axios';
import { Readable } from 'stream';
import { FileDto, FileInfo } from '../../domain';

export class FileDtoBuilder {
	public static build(name: string, data: Readable, mimeType: string): FileDto {
		const file = new FileDto({ name, data, mimeType });

		return file;
	}

	public static buildFromRequest(fileInfo: FileInfo, data: Readable): FileDto {
		const file = FileDtoBuilder.build(fileInfo.name, data, fileInfo.mimeType);

		return file;
	}

	public static buildFromAxiosResponse(name: string, response: AxiosResponse<Readable>): FileDto {
		const mimeType = response.headers['Content-Type']?.toString() ?? 'application/octet-stream';
		const file = FileDtoBuilder.build(name, response.data, mimeType);

		return file;
	}
}
