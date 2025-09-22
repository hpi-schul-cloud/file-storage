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
			const expectedFile = new FileDto({ name, data, mimeType });

			return { name, data, mimeType, expectedFile };
		};

		it('should return a FileDto with the provided values', () => {
			const { name, data, mimeType, expectedFile } = setup();

			const result = FileDtoBuilder.build(name, data, mimeType);

			expect(result).toEqual(expectedFile);
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
				const expectedFile = new FileDto({
					name,
					data: readable,
					mimeType,
				});

				return { name, response, expectedFile };
			};

			it('should return file from request', () => {
				const { response, expectedFile, name } = setup();

				const result = FileDtoBuilder.buildFromAxiosResponse(name, response);

				expect(result).toEqual(expectedFile);
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
				const expectedFile = new FileDto({
					name,
					data: readable,
					mimeType: 'application/octet-stream',
				});

				return { name, response, expectedFile };
			};

			it('should return file with default mime type', () => {
				const { response, expectedFile, name } = setup();

				const result = FileDtoBuilder.buildFromAxiosResponse(name, response);

				expect(result).toEqual(expectedFile);
			});
		});
	});

	describe('buildFromBusboyFileInfo', () => {
		const setup = () => {
			const readable = Readable.from('abc');
			const busboyFileInfo = busboyFileInfoTestFactory().build();
			const expectedFile = new FileDto({
				name: busboyFileInfo.filename,
				data: readable,
				mimeType: busboyFileInfo.mimeType,
			});

			return { busboyFileInfo, readable, expectedFile };
		};

		it('should return file from busboy fileInfo', () => {
			const { busboyFileInfo, readable, expectedFile } = setup();

			const result = FileDtoBuilder.buildFromBusboyFileInfo(busboyFileInfo, readable);

			expect(result).toEqual(expectedFile);
		});
	});
});
