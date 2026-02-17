import { FileRecord } from '../../../domain';
import { FileRecordConsumerListResponse, FileRecordConsumerResponse } from '../dto/file-storage-consumer.response';

export class FileRecordConsumerMapper {
	public static mapToFileRecordResponse(fileRecord: FileRecord): FileRecordConsumerResponse {
		const props = fileRecord.getProps();

		return new FileRecordConsumerResponse(props);
	}

	public static mapToFileRecordListResponse(
		fileRecords: FileRecord[],
		total: number,
		skip?: number,
		limit?: number
	): FileRecordConsumerListResponse {
		const responseFileRecords = fileRecords.map((fileRecord) => {
			return this.mapToFileRecordResponse(fileRecord);
		});
		const response = new FileRecordConsumerListResponse(responseFileRecords, total, skip, limit);

		return response;
	}
}
