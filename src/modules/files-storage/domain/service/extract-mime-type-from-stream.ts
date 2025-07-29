import { loadEsm } from 'load-esm';
import { PassThrough } from 'node:stream';

// TODO: Es gibt unterschiedliche Implementierungen wie wir den stream wieder neu zuweisen
export async function extractMimeTypeFromPeparedStream(
	// file: FileDto
	stream: PassThrough
): Promise<string | undefined> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	const streamWithFileType = await fileTypeStream(stream);
	const detectedMimeType = streamWithFileType.fileType?.mime;

	// The original stream cannot be reused after it has been fully read, because streams in Node.js are typically readable only once.
	// file.data = streamWithFileType;

	return detectedMimeType;
}
