import { AxiosResponse } from 'axios';
import { FileInfo as BusboyFileInfo } from 'busboy';
import { Readable } from 'node:stream';
import { FileDto, FileDtoFactory, StorageType } from '../../domain';

export class FileDtoMapper {
	public static mapFromAxiosResponse(
		name: string,
		response: AxiosResponse<Readable>,
		storageType: StorageType,
		abortSignal?: AbortSignal
	): FileDto {
		const mimeType = response.headers['Content-Type']?.toString() ?? 'application/octet-stream';
		const file = FileDtoFactory.create(name, response.data, mimeType, abortSignal, storageType);

		return file;
	}

	public static mapFromBusboyFileInfo(
		fileInfo: BusboyFileInfo,
		stream: Readable,
		storageType: StorageType,
		abortSignal: AbortSignal
	): FileDto {
		const file = FileDtoFactory.create(fileInfo.filename, stream, fileInfo.mimeType, abortSignal, storageType);

		return file;
	}
}
