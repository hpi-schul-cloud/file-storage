import { PayloadTooLargeException } from '@nestjs/common';
import { PassThrough } from 'node:stream';
import { passThroughFileDtoTestFactory } from '../../testing/pass-through-file-dto.test.factory';
import { StreamFileSizeObserver } from './stream-file-size.observer';

describe('StreamFileSizeObserver', () => {
	describe('observe', () => {
		describe('when observing a PassThroughFileDto created by factory', () => {
			it('should track file size automatically when created by PassThroughFileDtoFactory', (done) => {
				const passThroughFileDto = passThroughFileDtoTestFactory().asText().build();
				StreamFileSizeObserver.observe(passThroughFileDto, Number.MAX_SAFE_INTEGER);

				passThroughFileDto.streamCompletion
					?.then(() => {
						expect(passThroughFileDto.fileSize).toBe(46);
						done();
					})
					.catch(done);
			});

			it('should track file size for PNG content', (done) => {
				const passThroughFileDto = passThroughFileDtoTestFactory().asPng().build();
				StreamFileSizeObserver.observe(passThroughFileDto, Number.MAX_SAFE_INTEGER);

				passThroughFileDto.streamCompletion
					?.then(() => {
						expect(passThroughFileDto.fileSize).toBe(8);
						done();
					})
					.catch(done);
			});

			it('should track file size for different mime types', (done) => {
				const passThroughFileDto = passThroughFileDtoTestFactory().asSvg().build();
				StreamFileSizeObserver.observe(passThroughFileDto, Number.MAX_SAFE_INTEGER);

				passThroughFileDto.streamCompletion
					?.then(() => {
						expect(passThroughFileDto.fileSize).toBeGreaterThan(0);
						done();
					})
					.catch(done);
			});
		});

		describe('when observing custom objects with fileSize and data properties', () => {
			it('should initialize fileSize to 0 and track data flow', (done) => {
				const passThrough = new PassThrough();
				const obj = {
					fileSize: 999, // Initial value that should be reset
					data: passThrough,
				};

				StreamFileSizeObserver.observe(obj, Number.MAX_SAFE_INTEGER);
				expect(obj.fileSize).toBe(0); // Should be reset immediately

				const chunk = Buffer.from('test data');

				passThrough.on('end', () => {
					expect(obj.fileSize).toBe(chunk.length);
					done();
				});

				passThrough.write(chunk);
				passThrough.end();
			});

			it('should handle multiple chunks correctly', (done) => {
				const passThrough = new PassThrough();
				const obj = {
					fileSize: 0,
					data: passThrough,
				};

				StreamFileSizeObserver.observe(obj, Number.MAX_SAFE_INTEGER);

				const chunks = ['Hello', ' ', 'World', '!'].map((s) => Buffer.from(s));
				const expectedSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

				passThrough.on('end', () => {
					expect(obj.fileSize).toBe(expectedSize);
					expect(obj.fileSize).toBe(12); // "Hello World!" = 12 characters
					done();
				});

				chunks.forEach((chunk) => passThrough.write(chunk));
				passThrough.end();
			});
		});

		describe('edge cases', () => {
			it('should handle empty streams', (done) => {
				const passThrough = new PassThrough();
				const obj = {
					fileSize: 0,
					data: passThrough,
				};

				StreamFileSizeObserver.observe(obj, Number.MAX_SAFE_INTEGER);

				passThrough.on('end', () => {
					expect(obj.fileSize).toBe(0);
					done();
				});

				passThrough.end();
			});

			it('should work with binary data', (done) => {
				const passThroughFileDto = passThroughFileDtoTestFactory().asOctetStream().build();
				StreamFileSizeObserver.observe(passThroughFileDto, Number.MAX_SAFE_INTEGER);

				passThroughFileDto.streamCompletion
					?.then(() => {
						expect(passThroughFileDto.fileSize).toBe(8);
						done();
					})
					.catch(done);
			});

			it('should reset fileSize even if it has a previous value', () => {
				const passThrough = new PassThrough();
				const obj = {
					fileSize: 12345,
					data: passThrough,
				};

				StreamFileSizeObserver.observe(obj, Number.MAX_SAFE_INTEGER);

				expect(obj.fileSize).toBe(0);
			});
		});

		describe('when file size exceeds the limit', () => {
			it('should emit a PayloadTooLargeException error when accumulated bytes exceed maxFileSize', (done) => {
				const passThrough = new PassThrough();
				const obj = { fileSize: 0, data: passThrough };

				StreamFileSizeObserver.observe(obj, 5);

				passThrough.on('error', (error) => {
					expect(error).toBeInstanceOf(PayloadTooLargeException);
					done();
				});

				passThrough.write(Buffer.from('exceeds')); // 7 bytes > 5
			});

			it('should destroy the stream after emitting the error', (done) => {
				const passThrough = new PassThrough();
				const obj = { fileSize: 0, data: passThrough };

				StreamFileSizeObserver.observe(obj, 3);

				passThrough.on('error', () => {
					// destroy() is called after emit('error') returns, so check asynchronously
					setImmediate(() => {
						expect(passThrough.destroyed).toBe(true);
						done();
					});
				});

				passThrough.write(Buffer.from('exceeds')); // 7 bytes > 3
			});

			it('should not emit an error when accumulated bytes are exactly at the limit', (done) => {
				const passThrough = new PassThrough();
				const obj = { fileSize: 0, data: passThrough };

				StreamFileSizeObserver.observe(obj, 5);

				passThrough.on('end', () => {
					expect(obj.fileSize).toBe(5);
					done();
				});

				passThrough.write(Buffer.from('hello')); // exactly 5 bytes — not exceeded
				passThrough.end();
			});
		});
	});
});
