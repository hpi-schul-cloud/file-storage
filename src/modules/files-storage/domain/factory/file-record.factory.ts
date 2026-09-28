import { ObjectId } from '@mikro-orm/mongodb';
import { type EntityId } from '@shared/domain/types';
import { FileRecord, type FileRecordProps } from '../file-record.do';
import { type ParentInfo } from '../interface';
import { StorageType } from '../storage-paths.const';
import { FileRecordSecurityCheck, ScanStatus } from '../vo';

export const FOLDER_MIME_TYPE = 'application/x-folder';

export class FileRecordFactory {
	private static build(fileRecordProps: FileRecordProps, securityCheck: FileRecordSecurityCheck): FileRecord {
		const fileRecord = new FileRecord(fileRecordProps, securityCheck);

		return fileRecord;
	}

	public static buildFromExternalInput(
		name: string,
		mimeType: string,
		params: ParentInfo,
		userId: string,
		storageType: StorageType
	): FileRecord {
		const defaultSecurityCheck = FileRecordSecurityCheck.createWithDefaultProps();

		const props: FileRecordProps = {
			id: new ObjectId().toHexString(),
			size: 0,
			name,
			mimeType,
			parentType: params.parentType,
			parentId: params.parentId,
			creatorId: userId,
			storageLocationId: params.storageLocationId,
			storageLocation: params.storageLocation,
			isUploading: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			storageType,
			folderId: params.folderId,
		};

		const fileRecord = FileRecordFactory.build(props, defaultSecurityCheck);

		return fileRecord;
	}

	public static buildFolder(name: string, params: ParentInfo, userId: string): FileRecord {
		const securityCheck = FileRecordSecurityCheck.scanned(ScanStatus.WONT_CHECK, 'folders have no binary content');

		const props: FileRecordProps = {
			id: new ObjectId().toHexString(),
			size: 0,
			name,
			mimeType: FOLDER_MIME_TYPE,
			parentType: params.parentType,
			parentId: params.parentId,
			creatorId: userId,
			storageLocationId: params.storageLocationId,
			storageLocation: params.storageLocation,
			createdAt: new Date(),
			updatedAt: new Date(),
			storageType: StorageType.STANDARD,
			isFolder: true,
			folderId: params.folderId,
		};

		const fileRecord = FileRecordFactory.build(props, securityCheck);

		return fileRecord;
	}

	public static buildFromFileRecordProps(props: FileRecordProps, securityCheck: FileRecordSecurityCheck): FileRecord {
		const fileRecord = FileRecordFactory.build(props, securityCheck);

		return fileRecord;
	}

	public static copy(fileRecord: FileRecord, userId: EntityId, targetParentInfo: ParentInfo): FileRecord {
		const { size, name, mimeType, id, storageType, isFolder } = fileRecord.getProps();
		const { parentType, parentId, storageLocation, storageLocationId, folderId } = targetParentInfo;
		const newSecurityCheck = fileRecord.createSecurityScanBasedOnStatus();

		const props: FileRecordProps = {
			id: new ObjectId().toHexString(),
			size,
			name,
			mimeType,
			parentType,
			parentId,
			creatorId: userId,
			storageLocationId,
			storageLocation,
			isUploading: undefined,
			isCopyFrom: id,
			createdAt: new Date(),
			updatedAt: new Date(),
			storageType,
			isFolder,
			folderId,
		};

		const fileRecordCopy = FileRecordFactory.build(props, newSecurityCheck);

		return fileRecordCopy;
	}
}
