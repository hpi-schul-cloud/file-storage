import { type PreviewOutputMimeTypes } from '../file-record.do';
import { type PreviewWidth } from '../interface';

export interface PreviewInfo {
	outputFormat?: PreviewOutputMimeTypes;
	width?: PreviewWidth;
	forceUpdate?: boolean;
}
