import { Readable } from 'stream';
import { FileDto } from '../dto';
import { FileDtoFactory } from './file-dto.factory';

describe('FileDtoFactory', () => {
	describe('create', () => {
		const setup = () => {
			const name = 'test.txt';
			const data = Readable.from('abc');
			const mimeType = 'text/plain';
			const expectedFile = new FileDto({ name, data, mimeType });

			return { name, data, mimeType, expectedFile };
		};

		it('should return a FileDto with the provided values', () => {
			const { name, data, mimeType, expectedFile } = setup();

			const result = FileDtoFactory.create(name, data, mimeType);

			expect(result).toEqual(expectedFile);
		});
	});
});
