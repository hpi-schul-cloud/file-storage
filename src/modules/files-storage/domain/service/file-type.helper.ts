import { loadEsm } from 'load-esm';
import { PassThrough, Readable } from 'node:stream';

/**
 * Chunks are piped by reference.
 * Events work for individual streams only.
 */
export const splitStream = (sourceStream: Readable): Readable => {
	const stream = new PassThrough();

	sourceStream.on('data', (chunk) => {
		stream.write(chunk);
	});

	sourceStream.on('end', () => {
		stream.end();
	});

	sourceStream.on('error', (err) => {
		stream.emit('error', err);
	});

	return stream;
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

	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	const streamPipe = splitStream(sourceStream);
	const stream = await fileTypeStream(streamPipe);
	const detectedMimeType = stream.fileType?.mime;
	const mimeType = detectedMimeType ?? fallbackMimeType;

	return mimeType;
}
