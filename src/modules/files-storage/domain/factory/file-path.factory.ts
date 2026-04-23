import { FileRecord } from '../file-record.do';
import { StorageFolders } from '../storage-paths.const';

export class FilePathFactory {
	/**
	 * - STANDARD: {storageLocationId}/{fileRecordId}
	 * - TEMP: temp/{storageLocationId}/{fileRecordId}
	 */
	public static create(fileRecord: FileRecord): string {
		const { storageType, storageLocationId } = fileRecord.getStorageReference();
		const folder = StorageFolders[storageType];

		return [folder, storageLocationId, fileRecord.id].filter(Boolean).join('/');
	}

	public static createMany(fileRecords: FileRecord[]): string[] {
		return fileRecords.map((fileRecord) => this.create(fileRecord));
	}

	public static createTrashPath(fileRecord: FileRecord): string {
		return [StorageFolders.TRASH, this.create(fileRecord)].join('/');
	}

	public static createManyTrashPaths(fileRecords: FileRecord[]): string[] {
		return fileRecords.map((fileRecord) => this.createTrashPath(fileRecord));
	}

	public static createPreviewDirectory(fileRecord: FileRecord): string {
		const { storageLocationId } = fileRecord.getStorageReference();

		return [StorageFolders.PREVIEW, storageLocationId, fileRecord.id].join('/');
	}

	public static createPreview(fileRecord: FileRecord, hash: string): string {
		return [this.createPreviewDirectory(fileRecord), hash].join('/');
	}
}
