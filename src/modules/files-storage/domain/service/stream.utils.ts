import type { ReadableStreamWithFileType } from 'file-type';
import { loadEsm } from 'load-esm';
import { PassThrough, Readable } from 'node:stream';

export async function fileTypeStream(file: Readable): Promise<ReadableStreamWithFileType> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	return fileTypeStream(file);
}

/**
 * Chunks are piped by reference.
 * Events work for individual streams only.
 */
export const cloneStream = (sourceStream: Readable): Readable => {
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

export async function detectMimeTypeByStream(
	sourceStream: Readable,
	fallbackMimeType: string
): Promise<{ mimeType: string; stream: Readable }> {
	if (!isFileTypePackageSupported(fallbackMimeType)) {
		return { mimeType: fallbackMimeType, stream: sourceStream };
	}

	// Create two separate clones - one for MIME detection, one to return
	const streamForDetection = cloneStream(sourceStream);
	const streamForReturn = cloneStream(sourceStream);

	const fileTypeStreamResult = await fileTypeStream(streamForDetection);
	const detectedMimeType = fileTypeStreamResult.fileType?.mime;
	const mimeType = detectedMimeType ?? fallbackMimeType;

	return { mimeType, stream: streamForReturn };
}

/**
 * @deprecated Use detectMimeTypeByStream instead, which returns both mimeType and stream
 */
export async function detectMimeTypeByStreamLegacy(sourceStream: Readable, fallbackMimeType: string): Promise<string> {
	const { mimeType } = await detectMimeTypeByStream(sourceStream, fallbackMimeType);

	return mimeType;
}

export default { fileTypeStream };
