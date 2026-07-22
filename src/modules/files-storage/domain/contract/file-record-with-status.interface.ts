import { type FileRecord } from '../file-record.do';
import { type FileRecordStatus } from '../interface';

export interface FileRecordWithStatus {
	fileRecord: FileRecord;
	status: FileRecordStatus;
}
