import { Logger } from '@infra/logger';
import { PassThrough } from 'node:stream';
import { FileTypeErrorLoggable } from './file-type-error.loggable';
import { FileTypeResult, detectFileTypeFromStream } from './file-type-stream.import';

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

export const resolveMimeType = (fallbackMimeType: string, fileTypeResult?: FileTypeResult): string => {
	const detectedMimeType = fileTypeResult?.mime;
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

	const fileTypeResult = await tryDetectMimeTypeByStream(passThrough, logger);

	/* istanbul ignore next */
	const mimeType = resolveMimeType(fallbackMimeType, fileTypeResult);

	return mimeType;
}

const tryDetectMimeTypeByStream = async (
	passThrough: PassThrough,
	logger: Logger
): Promise<FileTypeResult | undefined> => {
	try {
		const fileTypeResult = await detectFileTypeFromStream(passThrough);

		return fileTypeResult;
	} catch (error) {
		logger.debug(new FileTypeErrorLoggable(`Failed to detect mime type by stream: ${error}`));
	}
};

export default { detectMimeTypeByStream };
