import { loadEsm } from 'load-esm';
import { FileDto } from '../dto';

export async function extractMimeTypeFromPeparedStream(file: FileDto): Promise<string | undefined> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	const streamWithFileType = await fileTypeStream(file.data);
	const detectedMimeType = streamWithFileType.fileType?.mime;

	return detectedMimeType;
}
