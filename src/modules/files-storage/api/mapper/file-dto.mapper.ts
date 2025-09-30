import { AxiosResponse } from 'axios';
import { FileInfo as BusboyFileInfo } from 'busboy';
import { Readable } from 'node:stream';
import { FileDto, FileDtoBuilder } from '../../domain';

export class FileDtoMapper {
	public static buildFromAxiosResponse(name: string, response: AxiosResponse<Readable>): FileDto {
		const mimeType = response.headers['Content-Type']?.toString() ?? 'application/octet-stream';
		const file = FileDtoBuilder.build(name, response.data, mimeType);

		return file;
	}

	public static buildFromBusboyFileInfo(fileInfo: BusboyFileInfo, data: Readable): FileDto {
		const file = FileDtoBuilder.build(fileInfo.filename, data, fileInfo.mimeType);

		return file;
	}
}
