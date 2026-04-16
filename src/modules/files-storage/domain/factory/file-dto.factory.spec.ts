import { Readable } from 'stream';
import { FileDto } from '../dto';
import { StorageType } from '../storage-paths.const';
import { FileDtoFactory } from './file-dto.factory';

describe('FileDtoFactory', () => {
	describe('create', () => {
		const setup = () => {
			const name = 'test.txt';
			const data = Readable.from('abc');
			const mimeType = 'text/plain';
			const abortSignal = new AbortController().signal;
			const storageType = StorageType.TEMP;
			const expectedFile = new FileDto({
				name,
				data,
				mimeType,
				abortSignal,
				storageType,
			});

			return { name, data, mimeType, abortSignal, storageType, expectedFile };
		};

		it('should return a FileDto with the provided values', () => {
			const { name, data, mimeType, abortSignal, storageType, expectedFile } = setup();

			const result = FileDtoFactory.create(name, data, mimeType, abortSignal, storageType);

			expect(result).toEqual(expectedFile);
		});
	});
});
