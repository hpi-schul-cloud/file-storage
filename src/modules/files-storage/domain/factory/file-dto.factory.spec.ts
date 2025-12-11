import { Readable } from 'stream';
import { FileDto } from '../dto';
import { FileDtoFactory } from './file-dto.factory';
import { StreamFileSizeObserver } from './stream-file-size.observer';

describe('FileDtoFactory', () => {
	describe('create', () => {
		const setup = () => {
			const name = 'test.txt';
			const data = Readable.from('abc');
			const mimeType = 'text/plain';
			const expectedFile = new FileDto({
				name,
				data,
				mimeType,
				streamCompletion: expect.any(Promise),
				fileSizeObserver: expect.any(StreamFileSizeObserver),
			});

			return { name, data, mimeType, expectedFile };
		};

		it('should return a FileDto with the provided values', () => {
			const { name, data, mimeType, expectedFile } = setup();

			const result = FileDtoFactory.create(name, data, mimeType);

			expect(result).toEqual(expectedFile);
		});
	});
});
