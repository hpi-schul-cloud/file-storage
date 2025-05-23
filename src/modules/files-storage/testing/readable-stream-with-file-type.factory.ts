import { BaseFactory } from '@testing/factory/base.factory';
import { FileTypeResult, ReadableStreamWithFileType } from 'file-type';
import { Readable } from 'stream';

type ReadableStreamWithFileTypeProps = {
	fileType?: FileTypeResult;
	readable: Readable;
};

class ReadableStreamWithFileTypeImp extends Readable implements ReadableStreamWithFileType {
	public fileType?: FileTypeResult;

	constructor(props: ReadableStreamWithFileTypeProps) {
		super();
		this.fileType = props.fileType;
	}
}

export const readableStreamWithFileTypeFactory = BaseFactory.define<
	ReadableStreamWithFileTypeImp,
	ReadableStreamWithFileTypeProps
>(ReadableStreamWithFileTypeImp, () => {
	const readable = Readable.from('abc');

	return {
		fileType: {
			ext: 'png',
			mime: 'image/png',
		},
		readable,
	};
});
