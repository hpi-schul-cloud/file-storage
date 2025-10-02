import { FileRecord, FileRecordStatus, FileRecordWithStatus, StorageLocationParams } from '../../domain';
import { DeleteByStorageLocationResponse, FileRecordListResponse, FileRecordResponse, PaginationParams } from '../dto';

export class FileRecordMapper {
	public static mapToFileRecordResponse(fileRecord: FileRecord, status: FileRecordStatus): FileRecordResponse {
		const fileRecordResponse = new FileRecordResponse(fileRecord, status);

		return fileRecordResponse;
	}

	public static mapToFileRecordListResponse(
		fileRecordsWithStatus: FileRecordWithStatus[],
		total: number,
		paginationParams?: PaginationParams
	): FileRecordListResponse {
		const responseFileRecords = fileRecordsWithStatus.map((fileRecord) =>
			FileRecordMapper.mapToFileRecordResponse(fileRecord.fileRecord, fileRecord.status)
		);
		const response = new FileRecordListResponse(
			responseFileRecords,
			total,
			paginationParams?.skip,
			paginationParams?.limit
		);

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
