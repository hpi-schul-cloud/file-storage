import { type FileRecord, type PreviewStatus } from '../file-record.do';
import { type ScanStatus } from '../vo';

export interface FileRecordStatus {
	scanStatus: ScanStatus;
	previewStatus: PreviewStatus;
	isCollaboraEditable: boolean;
	exceedsCollaboraEditableFileSize: boolean;
}

export interface FileRecordWithStatus {
	fileRecord: FileRecord;
	status: FileRecordStatus;
}

export interface CollaboraEditabilityStatus {
	isCollaboraEditable: boolean;
	exceedsCollaboraEditableFileSize: boolean;
}
