import { type PreviewFileOptions } from '@infra/preview-generator';
import { type PreviewFileParams } from '../contract';

export class PreviewFileOptionsMapper {
	public static fromPreviewFileParams(
		params: PreviewFileParams,
		originFilePath: string,
		previewFilePath: string
	): PreviewFileOptions {
		const { previewParams, format } = params;

		const payload = {
			originFilePath,
			previewFilePath,
			previewOptions: {
				format,
				width: previewParams.width,
			},
		};

		return payload;
	}
}
