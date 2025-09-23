import { GetFileResponseTestFactory } from '@modules/files-storage/testing';
import { StreamableFile } from '@nestjs/common';
import { StreamableFileMapper } from './stream.response.mapper';

describe('FilesStorageMapper', () => {
	describe('mapToStreamableFile', () => {
		describe('when file is a PDF', () => {
			const setup = () => {
				const fileResponse = GetFileResponseTestFactory.build({
					name: 'test.pdf',
					mimeType: 'application/pdf',
				});

				return { fileResponse };
			};

			it('should return StreamableFile with inline disposition', () => {
				const { fileResponse } = setup();

				const result = StreamableFileMapper.fromResponse(fileResponse);

				expect(result).toBeInstanceOf(StreamableFile);

				const options = result.options;
				expect(options.type).toBe('application/pdf');
				expect(options.length).toBe(8);
			});
		});

		describe('when file is not a PDF', () => {
			const setup = () => {
				const fileResponse = GetFileResponseTestFactory.build({
					name: 'test.txt',
					mimeType: 'text/plain',
				});

				return { fileResponse };
			};

			it('should return StreamableFile with attachment disposition', () => {
				const { fileResponse } = setup();

				const result = StreamableFileMapper.fromResponse(fileResponse);

				expect(result).toBeInstanceOf(StreamableFile);

				const options = result.options;
				expect(options.type).toBe('text/plain');
				expect(options.length).toBe(8);
			});
		});
	});
});
