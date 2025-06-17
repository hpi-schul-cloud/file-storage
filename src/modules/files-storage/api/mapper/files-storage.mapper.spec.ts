import { AuthorizationBodyParamsReferenceType } from '@infra/authorization-client';
import { NotImplementedException, StreamableFile } from '@nestjs/common';
import { PreviewStatus, StorageLocation } from '../../domain';
import { FileRecordParentType } from '../../domain/interface';
import { fileRecordTestFactory, GetFileResponseTestFactory } from '../../testing';
import { FileRecordListResponse, FileRecordResponse } from '../dto';
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

	describe('mapToFileRecordResponse is called', () => {
		it('should return FileRecordResponse DO', () => {
			const fileRecord = fileRecordTestFactory().build();
			const props = fileRecord.getProps();
			const securityCheckProps = fileRecord.getSecurityCheckProps();

			const result = FilesStorageMapper.mapToFileRecordResponse(fileRecord);

			const expectedFileRecordResponse: FileRecordResponse = {
				id: props.id,
				name: props.name,
				url: expect.any(String),
				size: props.size,
				securityCheckStatus: securityCheckProps.status,
				parentId: props.parentId,
				creatorId: props.creatorId,
				mimeType: props.mimeType,
				parentType: props.parentType,
				deletedSince: props.deletedSince,
				previewStatus: PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
				createdAt: props.createdAt,
				updatedAt: props.updatedAt,
			};

			expect(result).toEqual(expectedFileRecordResponse);
		});
	});

	describe('mapToFileRecordListResponse is called', () => {
		it('should return instance of FileRecordListResponse', () => {
			const fileRecords = fileRecordTestFactory().buildList(3);

			const result = FilesStorageMapper.mapToFileRecordListResponse(fileRecords, fileRecords.length);

			expect(result).toBeInstanceOf(FileRecordListResponse);
		});

		it('should contains props [data, total, skip, limit]', () => {
			const fileRecords = fileRecordTestFactory().buildList(3);

			const result = FilesStorageMapper.mapToFileRecordListResponse(fileRecords, fileRecords.length, 0, 5);

			expect(result).toEqual(
				expect.objectContaining({
					data: expect.any(Array) as FileRecordResponse[],
					total: fileRecords.length,
					skip: 0,
					limit: 5,
				})
			);
		});

		it('should contains instances of FileRecordResponse', () => {
			const fileRecords = fileRecordTestFactory().buildList(3);

			const result = FilesStorageMapper.mapToFileRecordListResponse(fileRecords, fileRecords.length);

			expect(result.data).toBeInstanceOf(Array);
			expect(result.data[0]).toBeInstanceOf(FileRecordResponse);
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
