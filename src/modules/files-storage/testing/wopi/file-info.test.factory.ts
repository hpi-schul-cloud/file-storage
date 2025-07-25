import { FileInfo } from '../../domain';

class FileInfoTestFactory {
	private readonly props: FileInfo = {
		name: `file-${Math.floor(Math.random() * 1000)}.txt`,
		encoding: '7bit',
		mimeType: 'text/plain',
	};

	public build(params: Partial<FileInfo> = {}): FileInfo {
		return { ...this.props, ...params };
	}
}

export const fileInfoTestFactory = (): FileInfoTestFactory => new FileInfoTestFactory();
