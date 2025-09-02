import { createMock } from '@golevelup/ts-jest';
import { AxiosResponse } from 'axios';
import { Readable } from 'stream';
import { FileDto } from '../../domain/dto';
import { busboyFileInfoTestFactory } from '../../testing';
import { FileDtoBuilder } from './file-dto.builder';

describe('File Builder', () => {
	describe('build', () => {
		const setup = () => {
			const name = 'test.txt';
			const data = Readable.from('abc');
			const mimeType = 'text/plain';

			return { name, data, mimeType };
		};

		it('should return a FileDto with the provided values', () => {
			const { name, data, mimeType } = setup();

			const result = FileDtoBuilder.build(name, data, mimeType);

			expect(result).toBeInstanceOf(FileDto);
			expect(result.name).toBe(name);
			expect(result.mimeType).toBe(mimeType);
			expect(result.data).toBe(data);
		});
	});

	describe('buildFromAxiosResponse', () => {
		describe('when response has content-type header', () => {
			const setup = () => {
				const name = 'test.txt';
				const mimeType = 'text/plain';
				const readable = Readable.from('abc');
				const response = createMock<AxiosResponse<Readable>>({
					data: readable,
					headers: { 'Content-Type': mimeType },
				});

				return { name, response, mimeType };
			};

			it('should return file from request', () => {
				const { response, name, mimeType } = setup();

				const result = FileDtoBuilder.buildFromAxiosResponse(name, response);

				expect(result).toBeInstanceOf(FileDto);
				expect(result.name).toBe(name);
				expect(result.mimeType).toBe(mimeType);
				expect(result.data).toBe(response.data);
			});
		});

		describe('when response does not have content-type header', () => {
			const setup = () => {
				const name = 'test.txt';
				const readable = Readable.from('abc');
				const response = createMock<AxiosResponse<Readable>>({
					data: readable,
					headers: {},
				});

				return { name, response };
			};

			it('should return file with default mime type', () => {
				const { response, name } = setup();

				const result = FileDtoBuilder.buildFromAxiosResponse(name, response);

				expect(result).toBeInstanceOf(FileDto);
				expect(result.name).toBe(name);
				expect(result.data).toBe(response.data);
			});
		});
	});

	describe('buildFromBusboyFileInfo', () => {
		const setup = () => {
			const readable = Readable.from('abc');
			const busboyFileInfo = busboyFileInfoTestFactory().build();

			return { busboyFileInfo, readable };
		};

		it('should return file from busboy fileInfo', () => {
			const { busboyFileInfo, readable } = setup();

			const result = FileDtoBuilder.buildFromBusboyFileInfo(busboyFileInfo, readable);

			expect(result).toBeInstanceOf(FileDto);
			expect(result.name).toBe(busboyFileInfo.filename);
			expect(result.mimeType).toBe(busboyFileInfo.mimeType);
			expect(result.data).toBe(readable);
		});
	});
});
