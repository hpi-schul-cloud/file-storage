import { File } from '@infra/s3-client';
import type { PassThrough } from 'node:stream';
import { PreviewOptions } from './interface';

export class PreviewGeneratorBuilder {
	public static buildFile(preview: PassThrough, previewOptions: PreviewOptions): File {
		const { format } = previewOptions;

		const file = {
			data: preview,
			mimeType: format,
		};

		return file;
	}
}
