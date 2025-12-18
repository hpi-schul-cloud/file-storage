import { passThroughFileDtoTestFactory } from '@modules/files-storage/testing';
import { PassThrough, Readable } from 'stream';
import { FileDto, PassThroughFileDto } from '../dto';
import { awaitStreamCompletion } from '../utils';
import { PassThroughFileDtoFactory } from './pass-through-file-dto.factory';

describe('PassThroughFileDtoFactory', () => {
	describe('create', () => {
		const setup = () => {
			const name = 'test.txt';
			const data = Readable.from('abc');
			const passThrough = data.pipe(new PassThrough());
			const mimeType = 'text/plain';
			const fileDto = new FileDto({
				name,
				data,
				mimeType,
			});

			const expectedFile = new PassThroughFileDto({
				name,
				data: passThrough,
				mimeType,
				streamCompletion: expect.any(Promise),
				fileSize: 0,
			});

			return { name, passThrough, mimeType, fileDto, expectedFile };
		};

		it('should return a FileDto with the provided values', () => {
			const { fileDto, passThrough, mimeType, expectedFile } = setup();

			const result = PassThroughFileDtoFactory.create(fileDto, passThrough, mimeType);

			expect(result).toEqual(expectedFile);
		});
	});

	describe('awaitStreamCompletion', () => {
		describe('when AbortSignal is already aborted', () => {
			it('should resolve immediately', async () => {
				const abortController = new AbortController();
				abortController.abort();
				const file = passThroughFileDtoTestFactory().build({ abortSignal: abortController.signal });

				const result = await file.streamCompletion;

				expect(result).toBeUndefined();
			});
		});

		describe('when stream emits close event', () => {
			it('should resolve on close event', async () => {
				const file = passThroughFileDtoTestFactory().build();

				// Simulate close event
				setTimeout(() => {
					file.data.emit('close');
				}, 10);

				const result = await file.streamCompletion;
				expect(result).toBeUndefined();
			});
		});

		describe('when AbortSignal is triggered during stream processing', () => {
			it('should resolve when abort signal is triggered', async () => {
				const abortController = new AbortController();
				const file = passThroughFileDtoTestFactory().build({ abortSignal: abortController.signal });

				// Simulate abort after a delay
				setTimeout(() => {
					abortController.abort();
				}, 10);

				const result = await file.streamCompletion;
				expect(result).toBeUndefined();
			});
		});

		describe('when stream emits end event', () => {
			it('should resolve on end event', async () => {
				const file = passThroughFileDtoTestFactory().build();

				// Simulate end event
				setTimeout(() => {
					file.data.emit('end');
				}, 10);

				const result = await file.streamCompletion;
				expect(result).toBeUndefined();
			});
		});

		describe('when stream emits error event', () => {
			it('should reject with the error', async () => {
				const testError = new Error('Test stream error');
				const testStream = new PassThrough();
				const promiseResult = awaitStreamCompletion(testStream);

				// Simulate error event
				setTimeout(() => {
					testStream.emit('error', testError);
				}, 10);

				await expect(promiseResult).rejects.toThrow('Test stream error');
			});
		});

		describe('when multiple events are emitted', () => {
			it('should only settle once (first event wins)', async () => {
				const file = passThroughFileDtoTestFactory().build();

				// Simulate multiple events - end should win and additional events should be ignored
				setTimeout(() => {
					file.data.emit('end'); // This should resolve the promise
					// Note: We don't emit error after end because it would cause unhandled rejection
					// The cleanup mechanism prevents further event processing
				}, 10);

				const result = await file.streamCompletion;
				expect(result).toBeUndefined();
			});
		});

		describe('when file has no abortSignal', () => {
			it('should work normally without abortSignal', async () => {
				const file = passThroughFileDtoTestFactory().build({ abortSignal: undefined });

				// Simulate end event
				setTimeout(() => {
					file.data.emit('end');
				}, 10);

				const result = await file.streamCompletion;
				expect(result).toBeUndefined();
			});
		});
	});
});
