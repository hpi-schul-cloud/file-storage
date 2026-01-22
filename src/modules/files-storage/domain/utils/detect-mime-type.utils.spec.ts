import { PassThrough, Readable } from 'node:stream';
import { octetStreamReadable, svgReadable, textReadable } from '../../testing/buffer-with-types';
import * as FileTypeStream from './file-type-stream.import';
const { detectMimeTypeByStream, resolveMimeType } = require('./detect-mime-type.utils');

jest.mock('./file-type-stream.import');

describe('detectMimeTypeByStream', () => {
	describe('when fallback mime type is not supported by file-type package', () => {
		it('should return fallback mime type for text/csv', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'text/csv';

			const readable = textReadable();
			readable.pipe(passThrough);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType);

			expect(result).toBe('text/csv');
		});

		it('should return fallback mime type for image/svg+xml', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'image/svg+xml';

			const readable = svgReadable();
			readable.pipe(passThrough);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType);

			expect(result).toBe('image/svg+xml');
		});

		it('should return fallback mime type for application/msword', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'application/msword';

			const readable = octetStreamReadable();
			readable.pipe(passThrough);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType);

			expect(result).toBe('application/msword');
		});

		it('should return fallback mime type for application/vnd.ms-powerpoint', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'application/vnd.ms-powerpoint';

			const readable = octetStreamReadable();
			readable.pipe(passThrough);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType);

			expect(result).toBe('application/vnd.ms-powerpoint');
		});

		it('should return fallback mime type for application/vnd.ms-excel', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'application/vnd.ms-excel';

			const readable = octetStreamReadable();
			readable.pipe(passThrough);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType);

			expect(result).toBe('application/vnd.ms-excel');
		});
	});

	describe('when fallback mime type is supported by file-type package', () => {
		it('should return detected mime type when file-type detects it', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'application/octet-stream';
			const readable = octetStreamReadable();
			readable.pipe(passThrough);

			const mockFileTypeResult = {
				fileType: { mime: 'image/png' },
			};

			//@ts-ignore
			FileTypeStream.fileTypeStream.mockResolvedValueOnce(mockFileTypeResult);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType);

			expect(result).toBe('image/png');
		});

		it('should return fallback mime type when file-type does not detect it', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'application/octet-stream';

			const mockFileTypeResult = {
				fileType: null,
			};
			//@ts-ignore
			FileTypeStream.fileTypeStream.mockResolvedValueOnce(mockFileTypeResult);

			const readable = octetStreamReadable();
			readable.pipe(passThrough);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType);

			expect(result).toBe('application/octet-stream');
		});

		it('sould call fileTypeStreamResult.destroy(); to clean up the stream', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'application/octet-stream';
			const readable = octetStreamReadable();
			readable.pipe(passThrough);

			const mockFileTypeResult = {
				fileType: { mime: 'image/png' },
				destroy: jest.fn(),
			};

			//@ts-ignore
			FileTypeStream.fileTypeStream.mockResolvedValueOnce(mockFileTypeResult);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType);

			expect(result).toBe('image/png');
			expect(mockFileTypeResult.destroy).toHaveBeenCalled();
		});
	});

	describe('resolveMimeType', () => {
		it('should return detected mime type when fileType.mime is available', () => {
			const fileTypeStreamResult = {
				fileType: { mime: 'image/png' },
			};
			const fallbackMimeType = 'application/octet-stream';

			const result = resolveMimeType(fileTypeStreamResult, fallbackMimeType);

			expect(result).toBe('image/png');
		});

		it('should return fallback mime type when fileType is null', () => {
			const fileTypeStreamResult = {
				fileType: null,
			};
			const fallbackMimeType = 'text/plain';

			const result = resolveMimeType(fileTypeStreamResult, fallbackMimeType);

			expect(result).toBe('text/plain');
		});

		it('should return fallback mime type when fileType is undefined', () => {
			const fileTypeStreamResult = {
				fileType: undefined,
			};
			const fallbackMimeType = 'application/json';

			const result = resolveMimeType(fileTypeStreamResult, fallbackMimeType);

			expect(result).toBe('application/json');
		});

		it('should return fallback mime type when fileType.mime is undefined', () => {
			const fileTypeStreamResult = {
				fileType: { mime: undefined },
			};
			const fallbackMimeType = 'video/mp4';

			const result = resolveMimeType(fileTypeStreamResult, fallbackMimeType);

			expect(result).toBe('video/mp4');
		});

		it('should return fallback mime type when fileType.mime is application/x-cfb', () => {
			const fileTypeStreamResult = {
				fileType: { mime: 'application/x-cfb' },
			};
			const fallbackMimeType = 'video/mp4';

			const result = resolveMimeType(fileTypeStreamResult, fallbackMimeType);

			expect(result).toBe('video/mp4');
		});
	});

	describe('edge cases', () => {
		it('should handle stream errors gracefully', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'application/octet-stream';

			//@ts-ignore
			FileTypeStream.fileTypeStream.mockRejectedValueOnce(new Error('Stream error'));
			const readable = new Readable({
				read() {
					setImmediate(() => {
						this.destroy(new Error('Stream error'));
					});
				},
			});

			readable.on('error', () => {
				/* Expected error */
			});
			passThrough.on('error', () => {
				/* Expected error */
			});

			readable.pipe(passThrough);

			await expect(detectMimeTypeByStream(passThrough, fallbackMimeType)).rejects.toThrow();
		});
	});
});
