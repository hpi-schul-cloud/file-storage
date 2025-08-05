import { Readable } from 'stream';

export class StreamFileSizeObserver {
	private readonly stream: Readable;
	private fileSize: number;

	constructor(stream: Readable) {
		this.stream = stream;
		this.fileSize = 0;
	}

	private observeStream(): void {
		this.stream.on('data', (chunk: Buffer) => {
			this.fileSize += chunk.length;
		});
	}

	public getFileSize(): number {
		return this.fileSize;
	}

	public static create(stream: Readable): StreamFileSizeObserver {
		const observer = new StreamFileSizeObserver(stream);
		observer.observeStream();

		return observer;
	}
}
