import type { FileTypeResult } from 'file-type';
import { loadEsm } from 'load-esm';
import { Readable } from 'stream';

/* istanbul ignore next */
export async function detectFileTypeFromStream(file: Readable): Promise<FileTypeResult | undefined> {
	const { fileTypeFromStream } = await loadEsm<typeof import('file-type')>('file-type');

	const webStream = Readable.toWeb(file);
	const fileType = await fileTypeFromStream(webStream);

	return fileType;
}

export type { AnyWebReadableByteStreamWithFileType, FileTypeResult } from 'file-type';

export default { detectFileTypeFromStream };
