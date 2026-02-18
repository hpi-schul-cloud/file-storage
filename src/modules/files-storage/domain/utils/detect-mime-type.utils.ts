import { Logger } from '@infra/logger';
import { type ReadableStreamWithFileType } from 'file-type';
import { PassThrough } from 'node:stream';
import { FileTypeErrorLoggable } from './file-type-error.loggable';
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

export const resolveMimeType = (
	fallbackMimeType: string,
	fileTypeStreamResult?: ReadableStreamWithFileType
): string => {
	const detectedMimeType = fileTypeStreamResult?.fileType?.mime;
	const mimeType = filterDetectedMimeType(detectedMimeType) ?? fallbackMimeType;

	return mimeType;
};

export const filterDetectedMimeType = (mimeType?: string): string | undefined => {
	const excludedMimeTypes = ['application/x-cfb'];

	if (!mimeType || excludedMimeTypes.includes(mimeType)) return;

	return mimeType;
};

export async function detectMimeTypeByStream(
	passThrough: PassThrough,
	fallbackMimeType: string,
	logger: Logger
): Promise<string> {
	if (!isFileTypePackageSupported(fallbackMimeType)) {
		return fallbackMimeType;
	}

	const fileTypeStreamResult = await tryDetectMimeTypeByStream(passThrough, logger);

	/* istanbul ignore next */
	const mimeType = resolveMimeType(fallbackMimeType, fileTypeStreamResult);

	// Clean up the fileTypeStream to prevent memory leaks
	if (fileTypeStreamResult && typeof fileTypeStreamResult.destroy === 'function') {
		fileTypeStreamResult.destroy();
	}

	return mimeType;
}

const tryDetectMimeTypeByStream = async (
	passThrough: PassThrough,
	logger: Logger
): Promise<ReadableStreamWithFileType | undefined> => {
	try {
		const fileTypeStreamResult = await fileTypeStream(passThrough);

		return fileTypeStreamResult;
	} catch (error) {
		logger.debug(new FileTypeErrorLoggable(`Failed to detect mime type by stream: ${error}`));
	}
};

export default { detectMimeTypeByStream };
