import { Readable } from 'stream';

export class StreamFileSizeObserver {
	private fileSize: number;

	constructor(stream: Readable) {
		this.fileSize = 0;
		stream.on('data', (chunk: Buffer) => {
			this.fileSize += chunk.length;
		});
	}

	public getFileSize(): number {
		return this.fileSize;
	}

	public static create(stream: Readable): StreamFileSizeObserver {
		const observer = new StreamFileSizeObserver(stream);

		return observer;
	}
}
