import { FileInfo } from 'busboy';

let count = 0;

class BusboyFileInfoTestFactory {
	private readonly props: FileInfo = {
		encoding: 'utf8',
		mimeType: 'text/plain',
		filename: `${count++}.txt`,
	};

	public build(params: Partial<FileInfo> = {}): FileInfo {
		return { ...this.props, ...params };
	}
}

export const busboyFileInfoTestFactory = (): BusboyFileInfoTestFactory => new BusboyFileInfoTestFactory();
