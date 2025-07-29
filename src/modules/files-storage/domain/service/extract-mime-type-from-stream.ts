import { loadEsm } from 'load-esm';
import { FileDto } from '../dto';

export async function extractMimeTypeFromPeparedStream(file: FileDto): Promise<string | undefined> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	const streamWithFileType = await fileTypeStream(file.data);
	const detectedMimeType = streamWithFileType.fileType?.mime;

	// The original stream cannot be reused after it has been fully read (executed over the await), because streams in Node.js are typically readable only once.
	file.data = streamWithFileType;

	return detectedMimeType;
}
