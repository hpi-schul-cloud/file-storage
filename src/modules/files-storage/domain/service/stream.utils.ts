import type { ReadableStreamWithFileType } from 'file-type';
import { loadEsm } from 'load-esm';
import { PassThrough, Readable } from 'node:stream';

export async function fileTypeStream(file: Readable): Promise<ReadableStreamWithFileType> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	return fileTypeStream(file);
}

/**
 * Creates one or more clones of a source stream.
 * Chunks are piped by reference. Events work for individual streams only.
 */
export const cloneStreams = (sourceStream: Readable, count = 1): PassThrough[] => {
	const streams: PassThrough[] = [];

	for (let i = 0; i < count; i++) {
		streams.push(new PassThrough());
	}

	sourceStream.on('data', (chunk) => {
		streams.forEach((stream) => stream.write(chunk));
	});

	sourceStream.on('end', () => {
		streams.forEach((stream) => stream.end());
	});

	sourceStream.on('error', (err) => {
		streams.forEach((stream) => stream.emit('error', err));
	});

	return streams;
};

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
	if (!isFileTypePackageSupported(fallbackMimeType)) {
		return fallbackMimeType;
	}

	const fileTypeStreamResult = await fileTypeStream(sourceStream);
	const detectedMimeType = fileTypeStreamResult.fileType?.mime;
	const mimeType = detectedMimeType ?? fallbackMimeType;

	return mimeType;
}

export default { fileTypeStream };
