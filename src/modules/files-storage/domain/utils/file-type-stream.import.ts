import type { FileTypeResult } from 'file-type';
import { loadEsm } from 'load-esm';
import { Readable } from 'node:stream';
import { DEFAULT_CHUNK_SIZE } from './stream.utils';

/* istanbul ignore next */
export async function detectFileTypeFromStream(file: Readable): Promise<FileTypeResult | undefined> {
	const { fileTypeFromStream } = await loadEsm<typeof import('file-type')>('file-type');

	const webStream = Readable.toWeb(file, { strategy: { highWaterMark: DEFAULT_CHUNK_SIZE } });
	const fileType = await fileTypeFromStream(webStream);

	return fileType;
}

export type { AnyWebReadableByteStreamWithFileType, FileTypeResult } from 'file-type';

export default { detectFileTypeFromStream };
