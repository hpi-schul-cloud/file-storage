import { type FileRecord } from '../file-record.do';
import { type PreviewInfo } from '../interface';

export interface PreviewFileParams {
	fileRecord: FileRecord;
	previewParams: PreviewInfo;
	hash: string;
	format: string;
	bytesRange?: string;
}
