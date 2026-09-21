import { type Logger } from '@infra/logger';
import { type PassThrough } from 'node:stream';
import { zipBasedCollaboraMimeTypes } from '../file-record.do';
import { FileTypeErrorLoggable } from './file-type-error.loggable';
import { type FileTypeResult, detectFileTypeFromStream } from './file-type-stream.import';

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

// OOXML/ODF documents are ZIP containers; file-type's bounded ZIP scan can abandon before
// reaching the entries that identify the concrete format when a single embedded media entry
// is large, misreporting the file as a generic ZIP archive.
// In that specific case we trust the caller-declared mime type over the generic zip detection.
export const resolveMimeType = (fallbackMimeType: string, fileTypeResult?: FileTypeResult): string => {
	const genericZipMimeType = 'application/zip';
	const detectedMimeType = filterDetectedMimeType(fileTypeResult?.mime);

	if (detectedMimeType === genericZipMimeType && zipBasedCollaboraMimeTypes.has(fallbackMimeType)) {
		return fallbackMimeType;
	}

	return detectedMimeType ?? fallbackMimeType;
};

const filterDetectedMimeType = (mimeType?: string): string | undefined => {
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
