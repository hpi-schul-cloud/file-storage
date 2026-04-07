import { createMock } from '@golevelup/ts-jest';
import { PassThrough } from 'node:stream';
import { Logger } from 'winston';
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

			const mockFileTypeResult = { mime: 'image/png', ext: 'png' };

			//@ts-ignore
			FileTypeStream.fileTypeStream.mockResolvedValueOnce(mockFileTypeResult);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType, createMock<Logger>());

			expect(result).toBe('image/png');
		});

		it('should return fallback mime type when file-type does not detect it', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'application/octet-stream';

			//@ts-ignore
			FileTypeStream.fileTypeStream.mockResolvedValueOnce(undefined);

			const readable = octetStreamReadable();
			readable.pipe(passThrough);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType, createMock<Logger>());

			expect(result).toBe('application/octet-stream');
		});

		it('should return fallback mime type when fileTypeStream throws an error', async () => {
			const passThrough = new PassThrough();
			const fallbackMimeType = 'application/octet-stream';

			//@ts-ignore
			FileTypeStream.fileTypeStream.mockRejectedValueOnce(new Error('Stream error'));

			const readable = octetStreamReadable();
			readable.pipe(passThrough);

			const result = await detectMimeTypeByStream(passThrough, fallbackMimeType, createMock<Logger>());

			expect(result).toBe('application/octet-stream');
		});
	});

	describe('resolveMimeType', () => {
		it('should return detected mime type when mime is available', () => {
			const fileTypeResult = { mime: 'image/png', ext: 'png' };
			const fallbackMimeType = 'application/octet-stream';

			//@ts-ignore
			const result = resolveMimeType(fallbackMimeType, fileTypeResult);

			expect(result).toBe('image/png');
		});

		it('should return fallback mime type when fileTypeResult is undefined', () => {
			const fallbackMimeType = 'text/plain';

			const result = resolveMimeType(fallbackMimeType, undefined);

			expect(result).toBe('text/plain');
		});

		it('should return fallback mime type when mime is undefined', () => {
			const fallbackMimeType = 'video/mp4';

			//@ts-ignore
			const result = resolveMimeType(fallbackMimeType, { mime: undefined });

			expect(result).toBe('video/mp4');
		});

		it('should return fallback mime type when mime is application/x-cfb', () => {
			const fileTypeResult = { mime: 'application/x-cfb', ext: 'cfb' };
			const fallbackMimeType = 'video/mp4';

			//@ts-ignore
			const result = resolveMimeType(fallbackMimeType, fileTypeResult);

			expect(result).toBe('video/mp4');
		});
	});
});
