import { FileRecord, StorageType } from '../domain';

export const TEMP_STORAGE_FOLDER = 'temp';

export const STORAGE_TYPE_FOLDER_MAP: Partial<Record<StorageType, string>> = {
	[StorageType.TEMP]: TEMP_STORAGE_FOLDER,
};

export class FileRecordPathBuilder {
	public static build(fileRecord: FileRecord): string {
		const { storageType, storageLocationId } = fileRecord.getProps();
		const directory = storageType ? STORAGE_TYPE_FOLDER_MAP[storageType] : undefined;
		const path = [directory, storageLocationId, fileRecord.id].filter(Boolean).join('/');

		return path;
	}

	public static buildAll(fileRecords: FileRecord[]): string[] {
		return fileRecords.map((fileRecord) => FileRecordPathBuilder.build(fileRecord));
	}
}
