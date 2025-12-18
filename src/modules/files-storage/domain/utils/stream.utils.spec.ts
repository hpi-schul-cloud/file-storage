import { PassThrough, Readable } from 'node:stream';
import { awaitStreamCompletion, duplicateStream } from './stream.utils';

interface StreamWithInternals extends PassThrough {
	_writableState?: { highWaterMark: number };
}

describe('stream.utils', () => {
	describe('duplicateStream', () => {
		it('should duplicate stream data correctly', async () => {
			const sourceData = 'Hello World!';
			const sourceStream = Readable.from(sourceData);

			const [stream1, stream2] = duplicateStream(sourceStream, 2);

			const chunks1: Buffer[] = [];
			const chunks2: Buffer[] = [];

			stream1.on('data', (chunk) => chunks1.push(chunk));
			stream2.on('data', (chunk) => chunks2.push(chunk));

			await new Promise<void>((resolve) => {
				let endedStreams = 0;
				const onEnd = () => {
					endedStreams++;
					if (endedStreams === 2) resolve();
				};
				stream1.on('end', onEnd);
				stream2.on('end', onEnd);
			});

			const result1 = Buffer.concat(chunks1).toString();
			const result2 = Buffer.concat(chunks2).toString();

			expect(result1).toBe(sourceData);
			expect(result2).toBe(sourceData);
		});

		it('should handle source stream errors by destroying all target streams', async () => {
			const sourceStream = new Readable({
				read() {
					// Emit error after a short delay
					setImmediate(() => {
						this.destroy(new Error('Source stream error'));
					});
				},
			});

			const [stream1, stream2] = duplicateStream(sourceStream, 2);

			const stream1ErrorPromise = new Promise<Error>((resolve) => {
				stream1.on('error', resolve);
			});

			const stream2ErrorPromise = new Promise<Error>((resolve) => {
				stream2.on('error', resolve);
			});

			const [error1, error2] = await Promise.all([stream1ErrorPromise, stream2ErrorPromise]);

			expect(error1.message).toBe('Source stream error');
			expect(error2.message).toBe('Source stream error');
			expect(stream1.destroyed).toBe(true);
			expect(stream2.destroyed).toBe(true);
		});

		it('should create streams with correct highWaterMark', () => {
			const sourceStream = Readable.from('test');
			const [stream] = duplicateStream(sourceStream, 1);

			// PassThrough streams are duplex, check the writable side
			const writableState = (stream as StreamWithInternals)._writableState;
			expect(writableState?.highWaterMark).toBe(64 * 1024);
		});

		it('should handle individual target stream errors gracefully', async () => {
			let chunks = 0;
			const maxChunks = 3;

			// Create a stream that sends multiple chunks over time
			const sourceStream = new Readable({
				read() {
					if (chunks < maxChunks) {
						this.push(`chunk-${chunks}`);
						chunks++;
					} else if (chunks === maxChunks) {
						this.push(null); // End the stream
					}
				},
			});

			const [stream1, stream2] = duplicateStream(sourceStream, 2);

			// Set up data collection for stream2
			const chunks2: Buffer[] = [];
			stream2.on('data', (chunk) => chunks2.push(chunk));

			// Set up error handler for stream1 to avoid unhandled errors
			stream1.on('error', () => {
				// Expected error, ignore it
			});

			// Destroy stream1 after first chunk to simulate a target stream error
			let stream1ChunkCount = 0;
			stream1.on('data', () => {
				stream1ChunkCount++;
				if (stream1ChunkCount === 1) {
					stream1.destroy(new Error('Target stream error'));
				}
			});

			// Stream2 should still receive all chunks
			await new Promise<void>((resolve) => {
				stream2.on('end', resolve);
			});

			const result2 = Buffer.concat(chunks2).toString();
			expect(result2).toBe('chunk-0chunk-1chunk-2');
			expect(stream1.destroyed).toBe(true);
			expect(stream2.readableEnded).toBe(true); // stream2 ended normally, not destroyed
			// Note: PassThrough streams are marked as destroyed when ended normally
			// The important thing is that stream2 received all the data despite stream1 being destroyed
		});
	});

	describe('awaitStreamCompletion', () => {
		it('should resolve when stream ends', async () => {
			const passThrough = new PassThrough();

			const completionPromise = awaitStreamCompletion(passThrough);

			// For PassThrough streams, we need to end both sides
			passThrough.end();

			await expect(completionPromise).resolves.toBeUndefined();
		});

		it('should reject when stream errors', async () => {
			const passThrough = new PassThrough();

			const completionPromise = awaitStreamCompletion(passThrough);

			// Emit error
			passThrough.destroy(new Error('Stream error'));

			await expect(completionPromise).rejects.toThrow('Stream error');
		});

		it('should resolve when stream closes', async () => {
			const passThrough = new PassThrough();

			const completionPromise = awaitStreamCompletion(passThrough);

			// Close the stream (different from end)
			passThrough.destroy();

			await expect(completionPromise).resolves.toBeUndefined();
		});

		it('should resolve immediately if abortSignal is already aborted', async () => {
			const passThrough = new PassThrough();
			const controller = new AbortController();
			controller.abort();

			const completionPromise = awaitStreamCompletion(passThrough, controller.signal);

			await expect(completionPromise).resolves.toBeUndefined();
		});

		it('should resolve when abortSignal is triggered', async () => {
			const passThrough = new PassThrough();
			const controller = new AbortController();

			const completionPromise = awaitStreamCompletion(passThrough, controller.signal);

			// Abort after a short delay
			setImmediate(() => controller.abort());

			await expect(completionPromise).resolves.toBeUndefined();
		});
	});
});
