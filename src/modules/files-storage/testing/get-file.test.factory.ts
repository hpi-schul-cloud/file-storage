import { GetFile } from '@infra/s3-client';
import { Readable } from 'stream';
import { GetFileResponse } from '../domain/interface';

export class GetFileTestFactory {
	public static build(props?: { contentRange?: string; mimeType?: string }): GetFile {
		const text = 'testText';
		const readable = Readable.from(text);

		const fileResponse = {
			data: readable,
			contentType: props?.mimeType ?? 'image/webp',
			contentLength: text.length,
			contentRange: props?.contentRange,
			etag: 'testTag',
		};

		return fileResponse;
	}
}

export class GetFileResponseTestFactory {
	public static build(props: { contentRange?: string; mimeType?: string; name?: string } = {}): GetFileResponse {
		const name = props.name ?? 'testName';
		const file = GetFileTestFactory.build(props);
		const fileResponse = { ...file, name };

		return fileResponse;
	}
}
