import type { ReadableStreamWithFileType } from 'file-type';
import { loadEsm } from 'load-esm';
import { Readable } from 'node:stream';
import { duplicateStream } from './stream.utils';

export async function fileTypeStream(file: Readable): Promise<ReadableStreamWithFileType> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	return fileTypeStream(file);
}

const isFileTypePackageSupported = (mimeType: string): boolean => {
	const unsupportedMimeTypes = [
		'text/csv',
		'image/svg+xml',
		'application/msword',
		'application/vnd.ms-powerpoint',
		'application/vnd.ms-excel',
	];

	return !unsupportedMimeTypes.includes(mimeType);
};

export async function detectMimeTypeByStream(sourceStream: Readable, fallbackMimeType: string): Promise<string> {
	const stream = duplicateStream(sourceStream);
	if (!isFileTypePackageSupported(fallbackMimeType)) {
		return fallbackMimeType;
	}

	const fileTypeStreamResult = await fileTypeStream(stream);
	const detectedMimeType = fileTypeStreamResult.fileType?.mime;
	const mimeType = detectedMimeType ?? fallbackMimeType;

	return mimeType;
}

export default { detectMimeTypeByStream };
