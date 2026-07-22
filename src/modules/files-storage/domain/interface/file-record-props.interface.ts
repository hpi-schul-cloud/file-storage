import { type AuthorizableObject } from '@shared/domain/domain-object';
import { type EntityId } from '@shared/domain/types';
import { type StorageType } from '../storage-paths.const';
import { type FileRecordParentType } from './file-record-parent-type.enum';
import { type StorageLocation } from './storage-location.enum';

export interface FileRecordProps extends AuthorizableObject {
	id: EntityId;
	size: number;
	name: string;
	mimeType: string;
	parentType: FileRecordParentType;
	parentId: EntityId;
	creatorId?: EntityId;
	storageLocation: StorageLocation;
	storageLocationId: EntityId;
	deletedSince?: Date;
	isCopyFrom?: EntityId;
	isUploading?: boolean;
	previewGenerationFailed?: boolean;
	createdAt: Date;
	updatedAt: Date;
	contentLastModifiedAt?: Date;
	storageType: StorageType;
}
