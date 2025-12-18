import { PassThrough } from 'node:stream';
import { passThroughFileDtoTestFactory } from '../../testing/pass-through-file-dto.test.factory';
import { StreamFileSizeObserver } from './stream-file-size.observer';

describe('StreamFileSizeObserver', () => {
	describe('observe', () => {
		describe('when observing a PassThroughFileDto created by factory', () => {
			it('should track file size automatically when created by PassThroughFileDtoFactory', (done) => {
				const passThroughFileDto = passThroughFileDtoTestFactory().asText().build();
				StreamFileSizeObserver.observe(passThroughFileDto);

				passThroughFileDto.streamCompletion
					?.then(() => {
						expect(passThroughFileDto.fileSize).toBe(46);
						done();
					})
					.catch(done);
			});

			it('should track file size for PNG content', (done) => {
				const passThroughFileDto = passThroughFileDtoTestFactory().asPng().build();
				StreamFileSizeObserver.observe(passThroughFileDto);

				passThroughFileDto.streamCompletion
					?.then(() => {
						expect(passThroughFileDto.fileSize).toBe(8);
						done();
					})
					.catch(done);
			});

			it('should track file size for different mime types', (done) => {
				const passThroughFileDto = passThroughFileDtoTestFactory().asSvg().build();
				StreamFileSizeObserver.observe(passThroughFileDto);

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

				StreamFileSizeObserver.observe(obj);
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

				StreamFileSizeObserver.observe(obj);

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

				StreamFileSizeObserver.observe(obj);

				passThrough.on('end', () => {
					expect(obj.fileSize).toBe(0);
					done();
				});

				passThrough.end();
			});

			it('should work with binary data', (done) => {
				const passThroughFileDto = passThroughFileDtoTestFactory().asOctetStream().build();
				StreamFileSizeObserver.observe(passThroughFileDto);

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

				StreamFileSizeObserver.observe(obj);

				expect(obj.fileSize).toBe(0);
			});
		});
	});
});
