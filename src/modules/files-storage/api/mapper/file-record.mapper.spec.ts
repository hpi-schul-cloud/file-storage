import { fileRecordStatusTestFactory, fileRecordTestFactory, fileRecordWithStatusTestFactory } from '../../testing';
import { FileRecordListResponse, FileRecordResponse } from '../dto';
import { FileRecordMapper } from './file-record.mapper';

describe('FilesStorageMapper', () => {
	describe('mapToFileRecordResponse()', () => {
		it('should return FileRecordResponse DO', () => {
			const fileRecord = fileRecordTestFactory().build();
			const status = fileRecordStatusTestFactory().build();
			const result = FileRecordMapper.mapToFileRecordResponse(fileRecord, status);

			const { size, parentId, creatorId, parentType, isUploading, deletedSince, createdAt, updatedAt } =
				fileRecord.getProps();

			expect(result).toEqual({
				id: fileRecord.id,
				name: fileRecord.getName(),
				url: `/api/v3/file/download/${fileRecord.id}/${encodeURIComponent(fileRecord.getName())}`,
				size: size,
				parentId: parentId,
				creatorId: creatorId,
				mimeType: fileRecord.mimeType,
				parentType: parentType,
				isUploading: isUploading,
				deletedSince: deletedSince,
				createdAt: createdAt,
				updatedAt: updatedAt,
				previewStatus: status.previewStatus,
				securityCheckStatus: status.scanStatus,
				isCollaboraEditable: status.isCollaboraEditable,
				exceedsCollaboraEditableFileSize: status.exceedsCollaboraEditableFileSize,
			});
		});
	});

	describe('mapToFileRecordListResponse()', () => {
		it('should return instance of FileRecordListResponse', () => {
			const fileRecordsWithStatus = fileRecordWithStatusTestFactory().buildList(3);

			const result = FileRecordMapper.mapToFileRecordListResponse(fileRecordsWithStatus, fileRecordsWithStatus.length);

			expect(result).toBeInstanceOf(FileRecordListResponse);
		});

		it('should contains props [data, total, skip, limit]', () => {
			const fileRecordsWithStatus = fileRecordWithStatusTestFactory().buildList(3);

			const result = FileRecordMapper.mapToFileRecordListResponse(fileRecordsWithStatus, fileRecordsWithStatus.length, {
				skip: 0,
				limit: 5,
			});

			expect(result).toEqual(
				expect.objectContaining({
					data: expect.any(Array) as FileRecordResponse[],
					total: fileRecordsWithStatus.length,
					skip: 0,
					limit: 5,
				})
			);
		});

		it('should contains instances of FileRecordResponse', () => {
			const fileRecordsWithStatus = fileRecordWithStatusTestFactory().buildList(3);

			const result = FileRecordMapper.mapToFileRecordListResponse(fileRecordsWithStatus, fileRecordsWithStatus.length);

			expect(result.data).toBeInstanceOf(Array);
			expect(result.data[0]).toBeInstanceOf(FileRecordResponse);
		});
	});
});
