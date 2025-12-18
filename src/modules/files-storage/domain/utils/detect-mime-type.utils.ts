import type { ReadableStreamWithFileType } from 'file-type';
import { loadEsm } from 'load-esm';
import { PassThrough } from 'node:stream';

/* istanbul ignore next */
export async function fileTypeStream(passThrough: PassThrough): Promise<ReadableStreamWithFileType> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	return fileTypeStream(passThrough);
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

export const resolveMimeType = (fileTypeStreamResult: ReadableStreamWithFileType, fallbackMimeType: string): string => {
	const detectedMimeType = fileTypeStreamResult.fileType?.mime;
	const mimeType = detectedMimeType ?? fallbackMimeType;

	return mimeType;
};

export async function detectMimeTypeByStream(passThrough: PassThrough, fallbackMimeType: string): Promise<string> {
	if (!isFileTypePackageSupported(fallbackMimeType)) {
		return fallbackMimeType;
	}

	/* istanbul ignore next */
	const fileTypeStreamResult = await fileTypeStream(passThrough);

	/* istanbul ignore next */
	return resolveMimeType(fileTypeStreamResult, fallbackMimeType);
}

export default { detectMimeTypeByStream, fileTypeStream };
