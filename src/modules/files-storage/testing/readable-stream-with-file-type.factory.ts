import { BaseFactory } from '@testing/factory/base.factory';
import { FileTypeResult } from 'file-type';
import { ReadableStream } from 'node:stream/web';

interface ReadableStreamWithFileTypeProps {
	fileType?: FileTypeResult;
}

class ReadableStreamWithFileTypeImp extends ReadableStream<Uint8Array> {
	readonly fileType?: FileTypeResult;

	constructor(props: ReadableStreamWithFileTypeProps) {
		super({
			start(controller) {
				controller.enqueue(new TextEncoder().encode('abc'));
				controller.close();
			},
		});
		this.fileType = props.fileType;
	}
}

export const readableStreamWithFileTypeFactory = BaseFactory.define<
	ReadableStreamWithFileTypeImp,
	ReadableStreamWithFileTypeProps
>(ReadableStreamWithFileTypeImp, () => {
	return {
		fileType: {
			ext: 'png',
			mime: 'image/png',
		},
	};
});
