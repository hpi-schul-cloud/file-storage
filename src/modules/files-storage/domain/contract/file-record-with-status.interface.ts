import { type FileRecord } from '../file-record.do';
import { type FileRecordStatus } from './file-record-status.interface';

export interface FileRecordWithStatus {
	fileRecord: FileRecord;
	status: FileRecordStatus;
}
