import { PassThrough } from 'node:stream';

export class StreamFileSizeObserver {
	private fileSize: number;

	constructor(passThrough: PassThrough) {
		this.fileSize = 0;
		passThrough.on('data', (chunk: Buffer) => {
			this.fileSize += chunk.length;
		});
	}

	public getFileSize(): number {
		return this.fileSize;
	}

	public static create(passThrough: PassThrough): StreamFileSizeObserver {
		const observer = new StreamFileSizeObserver(passThrough);

		return observer;
	}
}
