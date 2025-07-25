import { createMock } from '@golevelup/ts-jest';
import { AxiosResponse } from 'axios';
import { Readable } from 'stream';
import { FileDto } from '../../domain/dto';
import { fileInfoTestFactory } from '../../testing';
import { FileDtoBuilder } from './file-dto.builder';

describe('File Builder', () => {
	describe('buildFromRequest is called', () => {
		const setup = () => {
			const readable = Readable.from('abc');
			const fileInfo = fileInfoTestFactory().build();
			const expectedFile = new FileDto({
				name: fileInfo.name,
				data: readable,
				mimeType: fileInfo.mimeType,
			});

			return { readable, expectedFile, fileInfo };
		};

		it('should return file from request', () => {
			const { fileInfo, readable, expectedFile } = setup();

			const result = FileDtoBuilder.buildFromRequest(fileInfo, readable);

			expect(result).toEqual(expectedFile);
		});
	});

	describe('buildFromAxiosResponse is called', () => {
		describe('when response has content-type header', () => {
			const setup = () => {
				const fileInfo = fileInfoTestFactory().build();
				const readable = Readable.from('abc');
				const response = createMock<AxiosResponse<Readable>>({
					data: readable,
					headers: { 'Content-Type': fileInfo.mimeType },
				});
				const expectedFile = new FileDto({
					name: fileInfo.name,
					data: readable,
					mimeType: fileInfo.mimeType,
				});

				return { fileInfo, response, expectedFile };
			};

			it('should return file from request', () => {
				const { response, expectedFile, fileInfo } = setup();

				const result = FileDtoBuilder.buildFromAxiosResponse(fileInfo.name, response);

				expect(result).toEqual(expectedFile);
			});
		});

		describe('when response does not have content-type header', () => {
			const setup = () => {
				const fileInfo = fileInfoTestFactory().build();
				const readable = Readable.from('abc');
				const response = createMock<AxiosResponse<Readable>>({
					data: readable,
					headers: {},
				});
				const expectedFile = new FileDto({
					name: fileInfo.name,
					data: readable,
					mimeType: 'application/octet-stream',
				});

				return { fileInfo, response, expectedFile };
			};

			it('should return file with default mime type', () => {
				const { response, expectedFile, fileInfo } = setup();

				const result = FileDtoBuilder.buildFromAxiosResponse(fileInfo.name, response);

				expect(result).toEqual(expectedFile);
			});
		});
	});
});
