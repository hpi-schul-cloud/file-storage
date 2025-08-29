import { FileRecordStatus, PreviewStatus, ScanStatus } from '../domain';

export class FileRecordStatusTestFactory {
	private scanStatus: ScanStatus = ScanStatus.VERIFIED;
	private previewStatus: PreviewStatus = PreviewStatus.AWAITING_SCAN_STATUS;
	private isCollaboraEditable = true;
	private exceedsCollaboraEditableFileSize = false;

	public withScanStatus(scanStatus: ScanStatus): this {
		this.scanStatus = scanStatus;

		return this;
	}

	public withPreviewStatus(previewStatus: PreviewStatus): this {
		this.previewStatus = previewStatus;

		return this;
	}

	public withIsCollaboraEditable(isEditable: boolean): this {
		this.isCollaboraEditable = isEditable;

		return this;
	}

	public withExceedsCollaboraEditableFileSize(exceeds: boolean): this {
		this.exceedsCollaboraEditableFileSize = exceeds;

		return this;
	}

	public build(): FileRecordStatus {
		return {
			scanStatus: this.scanStatus,
			previewStatus: this.previewStatus,
			isCollaboraEditable: this.isCollaboraEditable,
			exceedsCollaboraEditableFileSize: this.exceedsCollaboraEditableFileSize,
		};
	}
}

export const fileRecordStatusTestFactory = (): FileRecordStatusTestFactory => new FileRecordStatusTestFactory();
