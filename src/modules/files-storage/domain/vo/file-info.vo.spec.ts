import { FileInfo } from './file-info.vo';

describe('FileInfo', () => {
	describe('constructor', () => {
		describe('when props are valid', () => {
			const setup = () => {
				const fileInfo = {
					name: 'test-file.txt',
					encoding: 'utf-8',
					mimeType: 'text/plain',
				};

				return {
					fileInfo,
				};
			};

			it('should assign all properties from props', () => {
				const { fileInfo } = setup();

				const result = new FileInfo(fileInfo);

				expect(result.name).toBe(fileInfo.name);
				expect(result.encoding).toBe(fileInfo.encoding);
				expect(result.mimeType).toBe(fileInfo.mimeType);
			});
		});

		describe('when name is undefined', () => {
			const setup = () => {
				const fileInfo = {
					name: undefined,
					encoding: 'utf-8',
					mimeType: 'text/plain',
				};

				return {
					fileInfo,
				};
			};

			it('should throw an error', () => {
				const { fileInfo } = setup();

				expect(() => new FileInfo(fileInfo as unknown as FileInfo)).toThrowError();
			});
		});

		describe('when name is null', () => {
			const setup = () => {
				const fileInfo = {
					name: null,
					encoding: 'utf-8',
					mimeType: 'text/plain',
				};

				return {
					fileInfo,
				};
			};

			it('should throw an error', () => {
				const { fileInfo } = setup();

				expect(() => new FileInfo(fileInfo as unknown as FileInfo)).toThrowError();
			});
		});

		describe('when name is number', () => {
			const setup = () => {
				const fileInfo = {
					name: 12345,
					encoding: 'utf-8',
					mimeType: 'text/plain',
				};

				return {
					fileInfo,
				};
			};

			it('should throw an error', () => {
				const { fileInfo } = setup();

				expect(() => new FileInfo(fileInfo as unknown as FileInfo)).toThrowError();
			});
		});

		describe('when encoding is undefined', () => {
			const setup = () => {
				const fileInfo = {
					name: 'test-file.txt',
					encoding: undefined,
					mimeType: 'text/plain',
				};

				return {
					fileInfo,
				};
			};

			it('should assign defined properties', () => {
				const { fileInfo } = setup();

				const result = new FileInfo(fileInfo);

				expect(result.name).toBe(fileInfo.name);
				expect(result.mimeType).toBe(fileInfo.mimeType);
			});
		});

		describe('when encoding is null', () => {
			const setup = () => {
				const fileInfo = {
					name: 'test-file.txt',
					encoding: null,
					mimeType: 'text/plain',
				};

				return {
					fileInfo,
				};
			};

			it('should assign defined properties', () => {
				const { fileInfo } = setup();

				const result = new FileInfo(fileInfo as unknown as FileInfo);

				expect(result.name).toBe(fileInfo.name);
				expect(result.mimeType).toBe(fileInfo.mimeType);
			});
		});

		describe('when encoding is number', () => {
			const setup = () => {
				const fileInfo = {
					name: 'test-file.txt',
					encoding: 12345,
					mimeType: 'text/plain',
				};

				return {
					fileInfo,
				};
			};

			it('should throw an error', () => {
				const { fileInfo } = setup();

				expect(() => new FileInfo(fileInfo as unknown as FileInfo)).toThrowError();
			});
		});

		describe('when mimeType is undefined', () => {
			const setup = () => {
				const fileInfo = {
					name: 'test-file.txt',
					encoding: 'utf-8',
					mimeType: undefined,
				};

				return {
					fileInfo,
				};
			};

			it('should throw an error', () => {
				const { fileInfo } = setup();

				expect(() => new FileInfo(fileInfo as unknown as FileInfo)).toThrowError();
			});
		});

		describe('when mimeType is null', () => {
			const setup = () => {
				const fileInfo = {
					name: 'test-file.txt',
					encoding: 'utf-8',
					mimeType: null,
				};

				return {
					fileInfo,
				};
			};

			it('should throw an error', () => {
				const { fileInfo } = setup();

				expect(() => new FileInfo(fileInfo as unknown as FileInfo)).toThrowError();
			});
		});

		describe('when mimeType is number', () => {
			const setup = () => {
				const fileInfo = {
					name: 'test-file.txt',
					encoding: 'utf-8',
					mimeType: 12345,
				};

				return {
					fileInfo,
				};
			};

			it('should throw an error', () => {
				const { fileInfo } = setup();

				expect(() => new FileInfo(fileInfo as unknown as FileInfo)).toThrowError();
			});
		});

		describe('when mimeType is not a valid MIME type', () => {
			const setup = () => {
				const fileInfo = {
					name: 'test-file.txt',
					encoding: 'utf-8',
					mimeType: 'invalid/type',
				};

				return {
					fileInfo,
				};
			};

			it('should throw an error', () => {
				const { fileInfo } = setup();

				expect(() => new FileInfo(fileInfo as unknown as FileInfo)).toThrowError();
			});
		});
	});
});
