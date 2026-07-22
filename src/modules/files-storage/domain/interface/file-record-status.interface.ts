import { type ScanStatus } from '../vo';
import { type PreviewStatus } from './preview-status.enum';

export interface FileRecordStatus {
	scanStatus: ScanStatus;
	previewStatus: PreviewStatus;
	isCollaboraEditable: boolean;
	exceedsCollaboraEditableFileSize: boolean;
}
