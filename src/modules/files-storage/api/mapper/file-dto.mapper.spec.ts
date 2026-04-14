import { createMock } from '@golevelup/ts-jest';
import { AxiosResponse } from 'axios';
import { Readable } from 'node:stream';
import { FileDto, StorageType } from '../../domain';
import { busboyFileInfoTestFactory } from '../../testing';
import { FileDtoMapper } from './file-dto.mapper';

describe('FileDtoMapper', () => {
	describe('mapFromAxiosResponse', () => {
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

				const result = FileDtoMapper.mapFromAxiosResponse(name, response, StorageType.STANDARD);

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

				const result = FileDtoMapper.mapFromAxiosResponse(name, response, StorageType.STANDARD);

				expect(result).toEqual(expectedFile);
			});
		});
	});

	describe('mapFromBusboyFileInfo', () => {
		describe('when storageType is not provided', () => {
			const setup = () => {
				const abortController = new AbortController();
				const readable = Readable.from('abc');
				const busboyFileInfo = busboyFileInfoTestFactory().build();
				const expectedFile = new FileDto({
					name: busboyFileInfo.filename,
					data: readable,
					mimeType: busboyFileInfo.mimeType,
				});

				return { busboyFileInfo, readable, expectedFile, abortController };
			};

			it('should return file from busboy fileInfo', () => {
				const { busboyFileInfo, readable, expectedFile, abortController } = setup();

				const result = FileDtoMapper.mapFromBusboyFileInfo(
					busboyFileInfo,
					readable,
					StorageType.STANDARD,
					abortController.signal
				);

				expect(result).toEqual(expectedFile);
			});
		});

		describe('when storageType is provided', () => {
			const setup = () => {
				const abortController = new AbortController();
				const readable = Readable.from('abc');
				const storageType = StorageType.TEMP;
				const busboyFileInfo = busboyFileInfoTestFactory().build();
				const expectedFile = new FileDto({
					name: busboyFileInfo.filename,
					data: readable,
					mimeType: busboyFileInfo.mimeType,
					storageType,
				});

				return { busboyFileInfo, readable, expectedFile, storageType, abortController };
			};

			it('should return file with storageType from busboy fileInfo', () => {
				const { busboyFileInfo, readable, expectedFile, storageType, abortController } = setup();

				const result = FileDtoMapper.mapFromBusboyFileInfo(
					busboyFileInfo,
					readable,
					storageType,
					abortController.signal
				);

				expect(result).toEqual(expectedFile);
			});
		});
	});
});
