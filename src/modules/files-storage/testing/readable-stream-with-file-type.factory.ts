import { BaseFactory } from '@testing/factory/base.factory';
import { FileTypeResult, ReadableStreamWithFileType } from 'file-type';
import { PassThrough, Readable } from 'stream';

interface ReadableStreamWithFileTypeProps {
	fileType?: FileTypeResult;
	readable: Readable;
}

class ReadableStreamWithFileTypeImp extends Readable implements ReadableStreamWithFileType {
	fileType?: FileTypeResult;
	private data: Buffer;
	private index = 0;

	constructor(props: ReadableStreamWithFileTypeProps) {
		super();
		this.fileType = props.fileType;
		this.data = Buffer.from('abc');
	}

	public _read(): void {
		if (this.index < this.data.length) {
			this.push(this.data.slice(this.index, this.index + 1));
			this.index++;
		} else {
			this.push(null);
		}
	}
}

export const readableStreamWithFileTypeFactory = BaseFactory.define<
	ReadableStreamWithFileTypeImp,
	ReadableStreamWithFileTypeProps
>(ReadableStreamWithFileTypeImp, () => {
	const readable = Readable.from('abc');
	const passThrough = readable.pipe(new PassThrough());

	return {
		fileType: {
			ext: 'png',
			mime: 'image/png',
		},
		readable: passThrough,
	};
});
