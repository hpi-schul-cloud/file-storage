import { Readable } from 'stream';

export class StreamFileSizeObserver {
	private readonly stream: Readable;
	private fileSizePromise: Promise<number> | undefined;

	constructor(stream: Readable) {
		this.stream = stream;
		this.fileSizePromise;
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
		return this.fileSizePromise as unknown as Promise<number>;
	}

	public static create(stream: Readable): StreamFileSizeObserver {
		const observer = new StreamFileSizeObserver(stream);
		observer.fileSizePromise = observer.observeStream();

		return new StreamFileSizeObserver(stream);
	}
}
