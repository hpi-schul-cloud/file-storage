import { FileRecord, FileRecordStatus, StorageLocationParams } from '../../domain';
import { DeleteByStorageLocationResponse, FileRecordListResponse, FileRecordResponse } from '../dto';

export class FileRecordMapper {
	public static mapToFileRecordResponse(fileRecord: FileRecord, status: FileRecordStatus): FileRecordResponse {
		const fileRecordResponse = new FileRecordResponse(fileRecord, status);

		return fileRecordResponse;
	}

	public static mapToFileRecordListResponse(
		fileRecordsStatus: { fileRecord: FileRecord; status: FileRecordStatus }[],
		total: number,
		skip?: number,
		limit?: number
	): FileRecordListResponse {
		const responseFileRecords = fileRecordsStatus.map((fileRecord) =>
			FileRecordMapper.mapToFileRecordResponse(fileRecord.fileRecord, fileRecord.status)
		);
		const response = new FileRecordListResponse(responseFileRecords, total, skip, limit);

		return response;
	}

	public static mapToDeleteByStorageLocationResponse(
		params: StorageLocationParams,
		deletedFiles: number
	): DeleteByStorageLocationResponse {
		const response = new DeleteByStorageLocationResponse({ ...params, deletedFiles });

		return response;
	}
}
