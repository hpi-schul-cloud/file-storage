import { PayloadTooLargeException } from '@nestjs/common';
import { type PassThrough } from 'node:stream';
import { ErrorType } from '../error';

interface HasFileSizeAndPassThrough {
	fileSize: number;
	data: PassThrough;
}

export class StreamFileSizeObserver {
	public static observe(obj: HasFileSizeAndPassThrough, maxFileSize: number): void {
		obj.fileSize = 0;
		obj.data.on('data', (chunk: Buffer) => {
			obj.fileSize += chunk.length;
			if (obj.fileSize > maxFileSize) {
				obj.data.emit('error', new PayloadTooLargeException(ErrorType.FILE_TOO_BIG));
				obj.data.destroy();
			}
		});
	}
}
