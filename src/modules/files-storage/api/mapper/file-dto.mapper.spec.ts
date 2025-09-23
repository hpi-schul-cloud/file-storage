import { createMock } from '@golevelup/ts-jest';
import { AxiosResponse } from 'axios';
import { Readable } from 'node:stream';
import { FileDto } from '../../domain';
import { busboyFileInfoTestFactory } from '../../testing';
import { FileDtoMapper } from './file-dto.mapper';

describe('File Builder', () => {
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

				const result = FileDtoMapper.buildFromAxiosResponse(name, response);

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

				const result = FileDtoMapper.buildFromAxiosResponse(name, response);

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

			const result = FileDtoMapper.buildFromBusboyFileInfo(busboyFileInfo, readable);

			expect(result).toEqual(expectedFile);
		});
	});
});
