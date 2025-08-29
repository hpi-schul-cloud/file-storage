import { AuthorizationBodyParamsReferenceType } from '@infra/authorization-client';
import { NotImplementedException, StreamableFile } from '@nestjs/common';
import { StorageLocation } from '../../domain';
import { FileRecordParentType } from '../../domain/interface';
import { GetFileResponseTestFactory } from '../../testing';
import { FilesStorageMapper } from './files-storage.mapper';

describe('FilesStorageMapper', () => {
	describe('mapToAllowedAuthorizationEntityType()', () => {
		it('should return allowed type equal Course', () => {
			const result = FilesStorageMapper.mapToAllowedAuthorizationEntityType(FileRecordParentType.Course);
			expect(result).toBe(AuthorizationBodyParamsReferenceType.COURSES);
		});

		it('should return allowed type equal Task', () => {
			const result = FilesStorageMapper.mapToAllowedAuthorizationEntityType(FileRecordParentType.Task);
			expect(result).toBe(AuthorizationBodyParamsReferenceType.TASKS);
		});

		it('should return allowed type equal School', () => {
			const result = FilesStorageMapper.mapToAllowedAuthorizationEntityType(FileRecordParentType.School);
			expect(result).toBe(AuthorizationBodyParamsReferenceType.SCHOOLS);
		});

		it('should return allowed type equal User', () => {
			const result = FilesStorageMapper.mapToAllowedAuthorizationEntityType(FileRecordParentType.User);
			expect(result).toBe(AuthorizationBodyParamsReferenceType.USERS);
		});

		it('should return allowed type equal Submission', () => {
			const result = FilesStorageMapper.mapToAllowedAuthorizationEntityType(FileRecordParentType.Submission);
			expect(result).toBe(AuthorizationBodyParamsReferenceType.SUBMISSIONS);
		});

		it('should return allowed type equal ExternalTool', () => {
			const result = FilesStorageMapper.mapToAllowedAuthorizationEntityType(FileRecordParentType.ExternalTool);
			expect(result).toBe(AuthorizationBodyParamsReferenceType.EXTERNAL_TOOLS);
		});

		it('should throw Error', () => {
			const exec = () => {
				FilesStorageMapper.mapToAllowedAuthorizationEntityType('' as FileRecordParentType);
			};
			expect(exec).toThrowError(NotImplementedException);
		});
	});

	describe('mapToAllowedStorageLocationType()', () => {
		it('should return allowed type equal SCHOOL', () => {
			const result = FilesStorageMapper.mapToAllowedStorageLocationType(StorageLocation.SCHOOL);
			expect(result).toBe(AuthorizationBodyParamsReferenceType.SCHOOLS);
		});

		it('should return allowed type equal INSTANCES', () => {
			const result = FilesStorageMapper.mapToAllowedStorageLocationType(StorageLocation.INSTANCE);
			expect(result).toBe(AuthorizationBodyParamsReferenceType.INSTANCES);
		});

		it('should throw Error', () => {
			const exec = () => {
				FilesStorageMapper.mapToAllowedStorageLocationType('' as StorageLocation);
			};
			expect(exec).toThrowError(NotImplementedException);
		});
	});

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

				const result = FilesStorageMapper.mapToStreamableFile(fileResponse);

				expect(result).toBeInstanceOf(StreamableFile);

				const options = result.options;
				expect(options.type).toBe('application/pdf');
				expect(options.length).toBe(8);
				expect(options.disposition).toContain('inline;');
				expect(options.disposition).toContain('filename="test.pdf"');
				expect(options.disposition).toContain("filename*=UTF-8''test.pdf");
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

				const result = FilesStorageMapper.mapToStreamableFile(fileResponse);

				expect(result).toBeInstanceOf(StreamableFile);

				const options = result.options;
				expect(options.type).toBe('text/plain');
				expect(options.length).toBe(8);
				expect(options.disposition).toContain('attachment;');
				expect(options.disposition).toContain('filename="test.txt"');
				expect(options.disposition).toContain("filename*=UTF-8''test.txt");
			});
		});

		describe('when file has special characters in name', () => {
			const setup = () => {
				const fileResponse = GetFileResponseTestFactory.build({
					name: 'ü bär.pdf',
					mimeType: 'application/pdf',
				});

				return { fileResponse };
			};

			it('should encode special characters in filename', () => {
				const { fileResponse } = setup();

				const result = FilesStorageMapper.mapToStreamableFile(fileResponse);

				const options = result.options;
				const encoded = encodeURIComponent('ü bär.pdf');
				expect(options.disposition).toContain(`filename="${encoded}"`);
				expect(options.disposition).toContain(`filename*=UTF-8''${encoded}`);
			});
		});
	});
});
