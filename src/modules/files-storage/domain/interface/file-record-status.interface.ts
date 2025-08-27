import { PreviewStatus } from '../file-record.do';
import { ScanStatus } from '../vo';

export interface FileRecordStatus {
	scanStatus: ScanStatus;
	previewStatus: PreviewStatus;
	isCollaboraEditable: boolean;
	exceedsCollaboraEditableFileSize: boolean;
}

export interface CollaboraEditabilityStatus {
	isCollaboraEditable: boolean;
	exceedsCollaboraEditableFileSize: boolean;
}
