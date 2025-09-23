import { Readable } from 'stream';
import { FileDto } from '../dto';
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
});
