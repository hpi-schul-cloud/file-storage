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
			objectMode: sourceStream.readableObjectMode,
			highWaterMark: 64 * 1024, // 64KB buffer for better performance with large files
		});

		// Set up error handling and cleanup for each stream
		passThrough.on('error', (error) => {
			// If this stream fails, clean up other streams to prevent leaks
			streams.forEach((otherStream) => {
				if (otherStream !== passThrough && !otherStream.destroyed) {
					otherStream.destroy(error);
				}
			});
		});

		// Handle premature close (e.g., S3 connection drops)
		passThrough.on('close', () => {
			// If stream closes unexpectedly and source is still active, clean up
			if (!sourceStream.destroyed && sourceStream.readable) {
				// Don't destroy source immediately - let other streams finish if possible
				process.nextTick(() => {
					const activeStreams = streams.filter((s) => !s.destroyed && s.readable);
					if (activeStreams.length === 0) {
						// All streams are closed, safe to destroy source
						sourceStream.destroy();
					}
				});
			}
		});

		streams.push(passThrough);
	}

	// Set up source stream error handling
	sourceStream.on('error', (error) => {
		// Propagate source errors to all destination streams
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.destroy(error);
			}
		});
	});

	// Use native pipe() for each stream - most reliable approach
	streams.forEach((stream) => {
		sourceStream.pipe(stream, { end: true });
	});

	// Handle source stream cleanup
	sourceStream.on('close', () => {
		// Ensure all streams are properly ended when source closes
		streams.forEach((stream) => {
			if (!stream.destroyed && stream.writable) {
				stream.end();
			}
		});
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
