import { AxiosResponse } from 'axios';
import { FileInfo as BusboyFileInfo } from 'busboy';
import { Readable } from 'node:stream';
import { FileDto, FileDtoFactory } from '../../domain';

export class FileDtoMapper {
	public static mapFromAxiosResponse(name: string, response: AxiosResponse<Readable>): FileDto {
		const mimeType = response.headers['Content-Type']?.toString() ?? 'application/octet-stream';
		const file = FileDtoFactory.create(name, response.data, mimeType);

		return file;
	}

	public static mapFromBusboyFileInfo(fileInfo: BusboyFileInfo, stream: Readable, abortSignal?: AbortSignal): FileDto {
		const file = FileDtoFactory.create(fileInfo.filename, stream, fileInfo.mimeType, abortSignal);

		return file;
	}
}
