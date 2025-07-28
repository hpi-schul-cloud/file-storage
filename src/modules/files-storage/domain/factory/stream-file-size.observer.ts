import { Readable } from 'stream';

export class StreamFileSizeObserver {
	private readonly stream: Readable;

	constructor(stream: Readable) {
		this.stream = stream;
	}

	public calculateFileSize(): Promise<number> {
		const promise = new Promise<number>((resolve) => {
			let fileSize = 0;

			this.stream.on('data', (chunk: Buffer) => {
				fileSize += chunk.length;
			});

			this.stream.on('end', () => resolve(fileSize));

			this.stream.on('error', (error: Error) => {
				// TODO!
				console.error('Error while calculating file size:', error);
				resolve(0);
			});
		});

		return promise;
	}

	public static create(stream: Readable): StreamFileSizeObserver {
		return new StreamFileSizeObserver(stream);
	}
}
