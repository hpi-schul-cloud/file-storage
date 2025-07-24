import { FileInfo } from '../vo/file-info.vo';
import { FileInfoFactory } from './file-info.factory';

describe('FileInfoFactory', () => {
	describe('build', () => {
		describe('when called with valid FileInfo', () => {
			const setup = () => {
				const fileInfo = {
					name: 'test.txt',
					encoding: 'utf-8',
					mimeType: 'text/plain',
				};

				return { fileInfo };
			};

			it('should return a FileInfo instance with correct properties', () => {
				const { fileInfo } = setup();

				const result = FileInfoFactory.build(fileInfo);

				expect(result).toBeInstanceOf(FileInfo);
				expect(result.name).toBe(fileInfo.name);
				expect(result.encoding).toBe(fileInfo.encoding);
				expect(result.mimeType).toBe(fileInfo.mimeType);
			});
		});
	});

	describe('buildFromParams', () => {
		describe('when called with valid params', () => {
			const setup = () => {
				const name = 'test.txt';
				const encoding = 'utf-8';
				const mimeType = 'text/plain';

				return { name, encoding, mimeType };
			};

			it('should return a FileInfo instance with correct properties', () => {
				const { name, encoding, mimeType } = setup();

				const result = FileInfoFactory.buildFromParams(name, mimeType, encoding);

				expect(result).toBeInstanceOf(FileInfo);
				expect(result.name).toBe(name);
				expect(result.encoding).toBe(encoding);
				expect(result.mimeType).toBe(mimeType);
			});
		});
	});
});
