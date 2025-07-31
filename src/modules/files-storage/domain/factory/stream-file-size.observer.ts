import { Readable } from 'stream';

export class StreamFileSizeObserver {
	private readonly stream: Readable;
	private readonly fileSizePromise: Promise<number>;

	constructor(stream: Readable) {
		this.stream = stream;
		this.fileSizePromise = this.observeStream();
	}

	private observeStream(): Promise<number> {
		const promise = new Promise<number>((resolve, reject) => {
			let fileSize = 0;

			this.stream.on('data', (chunk: Buffer) => {
				fileSize += chunk.length;
			});

			this.stream.on('end', () => resolve(fileSize));

			this.stream.on('error', () => {
				const error = new Error('Stream error occurred while calculating file size');
				reject(error);
			});
		});

		return promise;
	}

	public calculateFileSize(): Promise<number> {
		return this.fileSizePromise;
	}

	public static create(stream: Readable): StreamFileSizeObserver {
		return new StreamFileSizeObserver(stream);
	}
}
