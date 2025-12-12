import { PassThrough, Readable } from 'node:stream';

/**
 * Correct pipe-based stream duplication using a single distributor.
 * Fixes the issue where multiple .pipe() calls from the same source don't work.
 */
export const duplicateStreamViaPipe = (sourceStream: Readable, count = 1): PassThrough[] => {
	const streams: PassThrough[] = [];

	// Create destination streams
	for (let i = 0; i < count; i++) {
		const passThrough = new PassThrough({
			// objectMode: sourceStream.readableObjectMode,
			// highWaterMark: 64 * 1024, // Re-enable optimized buffer
		});
		streams.push(passThrough);
	}

	sourceStream.on('data', (chunk) => {
		streams.forEach((stream) => {
			stream.write(chunk);
		});
	});

	sourceStream.on('end', () => {
		streams.forEach((stream) => {
			stream.end();
		});
	});

	sourceStream.on('error', (error) => {
		streams.forEach((stream) => {
			stream.destroy(error);
		});
	});

	streams.forEach((stream) => {
		stream.on('error', () => {
			// If one stream fails, don't necessarily kill others
			// This allows for graceful degradation
			// Error is handled by the consuming code
		});
	});

	return streams;
};

export function awaitStreamCompletion(passThrough: PassThrough, abortSignal?: AbortSignal): Promise<void> {
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

		passThrough.on('end', onEnd);
		passThrough.on('error', onError);
		passThrough.on('close', onClose);
	});
}
