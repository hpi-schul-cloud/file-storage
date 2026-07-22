import { type PreviewOutputMimeTypes } from './preview-output-mime-types.enum';
import { type PreviewWidth } from './preview-width.enum';

export interface PreviewInfo {
	outputFormat?: PreviewOutputMimeTypes;
	width?: PreviewWidth;
	forceUpdate?: boolean;
}
