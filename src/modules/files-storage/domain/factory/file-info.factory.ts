import { FileInfo as BusboyFileInfo } from 'busboy';
import { FileInfo } from '../vo/file-info.vo';

export class FileInfoFactory {
	public static build(props: FileInfo): FileInfo {
		const fileInfo = new FileInfo(props);

		return fileInfo;
	}

	public static buildFromParams(name: string, mimeType: string, encoding?: string): FileInfo {
		const fileInfo = this.build({ name, encoding, mimeType });

		return fileInfo;
	}

	public static buildFromBusboyFileInfo(props: BusboyFileInfo): FileInfo {
		const fileInfo = this.build({
			name: props.filename,
			encoding: props.encoding,
			mimeType: props.mimeType,
		});

		return fileInfo;
	}
}
