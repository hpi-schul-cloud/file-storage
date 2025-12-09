import { PassThrough, Readable } from 'node:stream';

export function awaitStreamCompletion(data: Readable, abortSignal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (abortSignal?.aborted) {
			return resolve();
		}

		const onAbort = (): void => {
			resolve();
		};

		const onEnd = (): void => {
			resolve();
		};

		const onError = (error: Error): void => {
			reject(error);
		};

		const onClose = (): void => {
			resolve();
		};

		if (abortSignal) {
			abortSignal.addEventListener('abort', onAbort);
		}

		data.on('end', onEnd);
		data.on('error', onError);
		data.on('close', onClose);
	});
}

/**
 * Creates one or more duplicates of a source stream.
 * Chunks are piped by reference. Events work for individual streams only.
 */
export const duplicateStream = (sourceStream: Readable, count = 1): PassThrough[] => {
	const streams: PassThrough[] = [];

	for (let i = 0; i < count; i++) {
		streams.push(new PassThrough());
	}

	sourceStream.on('data', (chunk) => {
		streams.forEach((stream) => stream.write(chunk));
	});

	sourceStream.on('end', () => {
		streams.forEach((stream) => stream.end());
	});

	sourceStream.on('error', (err) => {
		streams.forEach((stream) => stream.emit('error', err));
	});

	return streams;
};
