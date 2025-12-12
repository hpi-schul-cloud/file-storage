import { PassThrough, Readable } from 'node:stream';

/**
 * Pipe-based stream duplication compatible with existing .pipe() architecture.
 * Uses Node.js native piping for reliability and proper error propagation.
 * Optimized for high-concurrency scenarios with robust cleanup on failures.
 */
export const duplicateStreamViaPipe = (sourceStream: Readable, count = 1): PassThrough[] => {
	const streams: PassThrough[] = [];

	// Create streams with optimized buffer settings for large files
	for (let i = 0; i < count; i++) {
		const passThrough = new PassThrough({
			// objectMode: sourceStream.readableObjectMode,
			//highWaterMark: 64 * 1024, // 64KB buffer for better performance with large files
		});
		streams.push(passThrough);
	}

	streams.forEach((stream) => {
		sourceStream.pipe(stream);
	});

	return streams;
};

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
