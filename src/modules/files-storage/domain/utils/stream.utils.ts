import { PassThrough, Readable } from 'node:stream';

/**
 * Correct pipe-based stream duplication using a single distributor.
 * Fixes the issue where multiple .pipe() calls from the same source don't work.
 */
export const duplicateStream = (sourceStream: Readable, count = 1): PassThrough[] => {
	const streams: PassThrough[] = [];

	for (let i = 0; i < count; i++) {
		const passThrough = new PassThrough({
			highWaterMark: 64 * 1024, // = 64KB, because busboy send typical chunks with 8-64KB. Default is 16KB and will increase cpu load with many small writes.
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
		const isAborted = abortSignal?.aborted;
		const isEnded = passThrough.readableEnded && passThrough.writableEnded;
		const isAlreadyDestroyed = passThrough.destroyed;
		if (isAborted || isEnded || isAlreadyDestroyed) {
			// Resolve (not reject) because the waiting is complete, regardless of reason
			return resolve();
		}

		const cleanup = (): void => {
			passThrough.removeListener('finish', onFinish);
			passThrough.removeListener('end', onEnd);
			passThrough.removeListener('error', onError);
			passThrough.removeListener('close', onClose);
			if (abortSignal) {
				abortSignal.removeEventListener('abort', onAbort);
			}
		};

		const onAbort = (): void => {
			cleanup();
			resolve();
		};

		const onFinish = (): void => {
			cleanup();
			resolve();
		};

		const onEnd = (): void => {
			cleanup();
			resolve();
		};

		const onError = (error: Error): void => {
			cleanup();
			reject(error);
		};

		const onClose = (): void => {
			cleanup();
			resolve();
		};

		if (abortSignal) {
			abortSignal.addEventListener('abort', onAbort);
		}

		passThrough.on('finish', onFinish);
		passThrough.on('end', onEnd);
		passThrough.on('error', onError);
		passThrough.on('close', onClose);
	});
}
