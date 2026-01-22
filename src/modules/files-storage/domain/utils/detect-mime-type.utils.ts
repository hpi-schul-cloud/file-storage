import { type ReadableStreamWithFileType } from 'file-type';
import { PassThrough } from 'node:stream';
import { fileTypeStream } from './file-type-stream.import';

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
	const mimeType = filterDetectedMimeType(detectedMimeType) ?? fallbackMimeType;

	return mimeType;
};

export const filterDetectedMimeType = (mimeType?: string): string | undefined => {
	const excludedMimeTypes = ['application/x-cfb'];

	if (!mimeType || excludedMimeTypes.includes(mimeType)) return;

	return mimeType;
};

export async function detectMimeTypeByStream(passThrough: PassThrough, fallbackMimeType: string): Promise<string> {
	if (!isFileTypePackageSupported(fallbackMimeType)) {
		return fallbackMimeType;
	}
	/* istanbul ignore next */
	const fileTypeStreamResult = await fileTypeStream(passThrough);

	/* istanbul ignore next */
	const mimeType = resolveMimeType(fileTypeStreamResult, fallbackMimeType);

	// Clean up the fileTypeStream to prevent memory leaks
	if (fileTypeStreamResult && typeof fileTypeStreamResult.destroy === 'function') {
		fileTypeStreamResult.destroy();
	}

	return mimeType;
}

export default { detectMimeTypeByStream };
