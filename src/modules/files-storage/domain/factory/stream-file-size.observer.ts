import { PassThrough } from 'node:stream';

interface HasFileSizeAndPassThrough {
	fileSize: number;
	data: PassThrough;
}

export class StreamFileSizeObserver {
	public static observe(obj: HasFileSizeAndPassThrough): void {
		obj.fileSize = 0;
		obj.data.on('data', (chunk: Buffer) => {
			obj.fileSize += chunk.length;
		});
	}
}
