import { loadEsm } from 'load-esm';
import { Readable } from 'node:stream';

export async function extractMimeTypeFromPeparedStream(stream: Readable): Promise<string | undefined> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	const streamWithFileType = await fileTypeStream(stream);
	const detectedMimeType = streamWithFileType.fileType?.mime;

	return detectedMimeType;
}
