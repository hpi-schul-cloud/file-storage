import { loadEsm } from 'load-esm';
import { PassThrough } from 'node:stream';
import { FileDto } from '../dto';

export async function extractMimeTypeFromPeparedStream(file: FileDto): Promise<string | undefined> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	const secureLockedStreamPipe1 = file.data.pipe(new PassThrough());
	const streamWithFileType = await fileTypeStream(secureLockedStreamPipe1);
	const detectedMimeType = streamWithFileType.fileType?.mime;
	const secureLockedStreamPipe2 = streamWithFileType.pipe(new PassThrough());

	// The original stream cannot be reused after it has been fully read (executed over the await), because streams in Node.js are typically readable only once.
	file.data = secureLockedStreamPipe2;

	return detectedMimeType;
}
