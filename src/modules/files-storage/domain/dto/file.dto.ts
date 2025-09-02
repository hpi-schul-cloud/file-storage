import { File } from '@infra/s3-client';
import { SanitizeHtml } from '@shared/transformer';
import { Readable } from 'stream';

export class FileDto implements File {
	@SanitizeHtml()
	name!: string;

	data!: Readable;

	mimeType!: string;
}
