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
export const duplicateStream = (sourceStream: Readable): PassThrough => {
	const stream = new PassThrough();

	sourceStream.on('data', (chunk) => {
		stream.write(chunk);
	});

	sourceStream.on('end', () => {
		stream.end();
	});

	sourceStream.on('error', (err) => {
		stream.emit('error', err);
	});

	return stream;
};
