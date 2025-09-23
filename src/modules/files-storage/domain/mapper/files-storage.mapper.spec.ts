import { AuthorizationBodyParamsReferenceType } from '@infra/authorization-client';
import { NotImplementedException } from '@nestjs/common';
import { FileRecordParentType, StorageLocation } from '../interface';
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
});
