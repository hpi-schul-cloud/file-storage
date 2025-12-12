import { PassThrough, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Creates one or more duplicates of a source stream.
 * This implementation ensures proper backpressure handling and prevents data loss.
 */
export const duplicateStream = (sourceStream: Readable, count = 1): PassThrough[] => {
	const streams: PassThrough[] = [];

	// Create all streams first with optimized buffer for large files
	for (let i = 0; i < count; i++) {
		streams.push(
			new PassThrough({
				objectMode: sourceStream.readableObjectMode,
				highWaterMark: 64 * 1024, // 64KB buffer for better performance with large files
			})
		);
	}

	// Track if source stream has ended
	let sourceEnded = false;
	let sourceError: Error | null = null;

	// Set up error handling first
	sourceStream.on('error', (err) => {
		sourceError = err;
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.destroy(err);
			}
		});
	});

	// Handle end/close events
	sourceStream.on('end', () => {
		sourceEnded = true;
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.end();
			}
		});
	});

	sourceStream.on('close', () => {
		if (!sourceEnded && !sourceError) {
			streams.forEach((stream) => {
				if (!stream.destroyed) {
					stream.end();
				}
			});
		}
	});

	// Handle backpressure properly
	const handleData = (chunk: Buffer | string): boolean => {
		if (sourceError || sourceEnded) {
			return false;
		}

		let allCanContinue = true;

		// Write to all streams and check backpressure
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				const canContinue = stream.write(chunk);
				if (!canContinue) {
					allCanContinue = false;
				}
			}
		});

		// If any stream has backpressure, pause the source
		if (!allCanContinue) {
			sourceStream.pause();

			// Resume when all streams are ready
			let resumeCount = 0;
			const checkResume = (): void => {
				resumeCount++;
				if (resumeCount === streams.filter((s) => !s.destroyed).length) {
					sourceStream.resume();
				}
			};

			streams.forEach((stream) => {
				if (!stream.destroyed) {
					stream.once('drain', checkResume);
				}
			});
		}

		return allCanContinue;
	};

	sourceStream.on('data', handleData);

	// Handle source pause/resume
	sourceStream.on('pause', () => {
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.pause();
			}
		});
	});

	sourceStream.on('resume', () => {
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.resume();
			}
		});
	});

	// Clean up if any duplicated stream is destroyed
	streams.forEach((stream) => {
		stream.on('close', () => {
			// If this stream is closed, we might want to clean up
			// but we don't want to affect other streams
		});
	});

	return streams;
};

/**
 * Alternative implementation using pipeline for more robust stream handling.
 * This version uses Node.js pipeline for better error handling and cleanup.
 */
export const duplicateStreamPipeline = (sourceStream: Readable, count = 1): PassThrough[] => {
	const streams: PassThrough[] = [];

	// Create all streams first
	for (let i = 0; i < count; i++) {
		streams.push(new PassThrough({ objectMode: sourceStream.readableObjectMode }));
	}

	// Use a custom transform stream to duplicate data
	const duplicator = new PassThrough({
		objectMode: sourceStream.readableObjectMode,
		transform(chunk, _encoding, callback): void {
			// Write the chunk to all destination streams
			let pendingWrites = streams.filter((s) => !s.destroyed).length;

			if (pendingWrites === 0) {
				callback();

				return;
			}

			let hasError = false;

			streams.forEach((stream) => {
				if (!stream.destroyed && !hasError) {
					stream.write(chunk, (err) => {
						if (err && !hasError) {
							hasError = true;
							callback(err);

							return;
						}

						pendingWrites--;
						if (pendingWrites === 0 && !hasError) {
							callback();
						}
					});
				} else {
					pendingWrites--;
					if (pendingWrites === 0 && !hasError) {
						callback();
					}
				}
			});
		},
		final(callback): void {
			// End all destination streams when source ends
			streams.forEach((stream) => {
				if (!stream.destroyed) {
					stream.end();
				}
			});
			callback();
		},
	});

	// Set up the pipeline
	try {
		// Don't await here as we want to return streams immediately
		pipeline(sourceStream, duplicator).catch((error) => {
			// Handle pipeline errors
			streams.forEach((stream) => {
				if (!stream.destroyed) {
					stream.destroy(error);
				}
			});
		});
	} catch (error) {
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.destroy(error instanceof Error ? error : new Error(String(error)));
			}
		});
		throw error;
	}

	return streams;
};

/**
 * Memory-efficient implementation for high-concurrency scenarios.
 * Optimized for up to 800 concurrent streams with files up to 2.5GB.
 * Uses minimal buffering and robust backpressure handling.
 */
export const duplicateStreamHighThroughput = (sourceStream: Readable, count = 1): PassThrough[] => {
	const streams: PassThrough[] = [];

	// Create streams with optimized buffer settings for large files
	for (let i = 0; i < count; i++) {
		streams.push(
			new PassThrough({
				objectMode: sourceStream.readableObjectMode,
				highWaterMark: 64 * 1024, // 64KB buffer instead of default 16KB
			})
		);
	}

	let sourceEnded = false;
	let sourceError: Error | null = null;
	let isPaused = false;

	// Error handling
	sourceStream.on('error', (err) => {
		sourceError = err;
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.destroy(err);
			}
		});
	});

	// End handling
	sourceStream.on('end', () => {
		sourceEnded = true;
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.end();
			}
		});
	});

	sourceStream.on('close', () => {
		if (!sourceEnded && !sourceError) {
			streams.forEach((stream) => {
				if (!stream.destroyed) {
					stream.end();
				}
			});
		}
	});

	// Optimized data handling with minimal overhead
	sourceStream.on('data', (chunk: Buffer | string) => {
		if (sourceError || sourceEnded) {
			return;
		}

		// Track streams that need backpressure handling
		const needsDrain: PassThrough[] = [];

		// Write to all streams synchronously first
		for (const stream of streams) {
			if (!stream.destroyed) {
				const canContinue = stream.write(chunk);
				if (!canContinue) {
					needsDrain.push(stream);
				}
			}
		}

		// Handle backpressure only if needed
		if (needsDrain.length > 0 && !isPaused) {
			isPaused = true;
			sourceStream.pause();

			// Wait for all blocked streams to drain
			let drainedCount = 0;
			const onDrain = (): void => {
				drainedCount++;
				if (drainedCount >= needsDrain.length && isPaused) {
					isPaused = false;
					sourceStream.resume();
				}
			};

			// Set up drain listeners
			needsDrain.forEach((stream) => {
				stream.once('drain', onDrain);
			});
		}
	});

	// Handle source pause/resume (pass-through)
	sourceStream.on('pause', () => {
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.pause();
			}
		});
	});

	sourceStream.on('resume', () => {
		streams.forEach((stream) => {
			if (!stream.destroyed) {
				stream.resume();
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
