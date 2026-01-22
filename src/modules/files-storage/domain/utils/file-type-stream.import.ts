import type { ReadableStreamWithFileType } from 'file-type';
import { loadEsm } from 'load-esm';
import { Readable } from 'stream';

/* istanbul ignore next */
export async function fileTypeStream(file: Readable): Promise<ReadableStreamWithFileType> {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	const stream = await fileTypeStream(file);

	return stream;
}

export default { fileTypeStream };
