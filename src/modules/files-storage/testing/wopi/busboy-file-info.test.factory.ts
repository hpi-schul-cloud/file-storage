import { FileInfo } from 'busboy';
import { randomUUID } from 'node:crypto';

class BusboyFileInfoTestFactory {
	private readonly props: FileInfo = {
		encoding: 'utf8',
		mimeType: 'text/plain',
		filename: `${randomUUID()}.bin`,
	};

	public build(params: Partial<FileInfo> = {}): FileInfo {
		return { ...this.props, ...params };
	}
}

export const busboyFileInfoTestFactory = (): BusboyFileInfoTestFactory => new BusboyFileInfoTestFactory();
