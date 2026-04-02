import { FileRecord, FileRecordPathBuilder, StorageType } from '../domain';

export const TEMP_STORAGE_FOLDER = 'temp';
export const PREVIEW_STORAGE_FOLDER = 'previews';

export const STORAGE_TYPE_FOLDER_MAP: Partial<Record<StorageType, string>> = {
	[StorageType.TEMP]: TEMP_STORAGE_FOLDER,
};

export class S3FileRecordPathBuilder implements FileRecordPathBuilder {
	public buildOriginPath(fileRecord: FileRecord): string {
		const { storageType, storageLocationId } = fileRecord.getProps();
		const directory = storageType ? STORAGE_TYPE_FOLDER_MAP[storageType] : undefined;
		const path = [directory, storageLocationId, fileRecord.id].filter(Boolean).join('/');

		return path;
	}

	public buildOriginPaths(fileRecords: FileRecord[]): string[] {
		return fileRecords.map((fileRecord) => this.buildOriginPath(fileRecord));
	}

	public buildPreviewDirectoryPath(fileRecord: FileRecord): string {
		return [PREVIEW_STORAGE_FOLDER, fileRecord.getProps().storageLocationId, fileRecord.id].join('/');
	}

	public buildPreviewFilePath(fileRecord: FileRecord, hash: string): string {
		return [this.buildPreviewDirectoryPath(fileRecord), hash].join('/');
	}
}
