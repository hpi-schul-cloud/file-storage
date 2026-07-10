import { type AxiosResponse } from 'axios';
import { type FileInfo as BusboyFileInfo } from 'busboy';
import { type Readable } from 'node:stream';
import { type FileDto, FileDtoFactory, type StorageType } from '../../domain';

export class FileDtoMapper {
	public static mapFromAxiosResponse(
		name: string,
		response: AxiosResponse<Readable>,
		storageType: StorageType,
		abortSignal?: AbortSignal
	): FileDto {
		const responseHeader1 = response.headers['Content-Type']?.toString();
		const responseHeader2 = response.headers['content-type']?.toString();

		const mimeType = responseHeader1 ?? responseHeader2 ?? 'application/octet-stream';
		const file = FileDtoFactory.create(name, response.data, mimeType, storageType, abortSignal);

		return file;
	}

	public static mapFromBusboyFileInfo(
		fileInfo: BusboyFileInfo,
		stream: Readable,
		storageType: StorageType,
		abortSignal: AbortSignal
	): FileDto {
		const file = FileDtoFactory.create(fileInfo.filename, stream, fileInfo.mimeType, storageType, abortSignal);

		return file;
	}
}
