import { type ScanStatus } from '../vo';
import { type PreviewStatus } from '../file-record.do';

export interface FileRecordStatus {
	scanStatus: ScanStatus;
	previewStatus: PreviewStatus;
	isCollaboraEditable: boolean;
	exceedsCollaboraEditableFileSize: boolean;
}
