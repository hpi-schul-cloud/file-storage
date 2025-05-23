import { loadEsm } from 'load-esm';
import { Readable } from 'stream';

export async function fileTypeStream(file: Readable) {
	const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

	const stream = await fileTypeStream(file);

	return stream;
}

export default { fileTypeStream };
