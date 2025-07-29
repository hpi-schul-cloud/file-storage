// import type { ReadableStreamWithFileType } from 'file-type';
import { loadEsm } from 'load-esm';
import { Readable } from 'stream';

// naming: detectedMimeTypeFromStream
export async function createFileTypeStream(x: Readable): Promise<string | undefined> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	const streamWithFileType = await fileTypeStream(x);
	/*
	if (!streamWithFileType.fileType) {
		throw new Error('File type could not be detected');
	}

	if (!streamWithFileType.fileType.mime) {
		throw new Error('File type MIME type could not be detected');
	}

	const detectedMimeType = streamWithFileType.fileType.mime;
	*/

	const detectedMimeType = streamWithFileType.fileType?.mime;

	return detectedMimeType;
}

export default { createFileTypeStream };
