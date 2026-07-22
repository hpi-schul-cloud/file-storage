import { type FindOptions } from '@shared/domain/interface';
import { type Counted, type EntityId } from '@shared/domain/types';
import { type FileRecord } from '../file-record.do';
import { type StorageLocation } from '../interface';
import { type StorageType } from '../storage-paths.const';
import { type ParentStatistic } from '../vo';

export interface FileRecordRepo {
	findOneById(id: EntityId): Promise<FileRecord>;

	findMultipleById(ids: EntityId[], options?: FindOptions<FileRecord>): Promise<Counted<FileRecord[]>>;

	findOneByIdMarkedForDelete(id: EntityId): Promise<FileRecord>;

	findMultipleByIdMarkedForDelete(ids: EntityId[], options?: FindOptions<FileRecord>): Promise<Counted<FileRecord[]>>;

	findByParentId(
		parentId: EntityId,
		options?: FindOptions<FileRecord>,
		storageType?: StorageType
	): Promise<Counted<FileRecord[]>>;

	findMarkedForDeleteByParentId(parentId: EntityId, options?: FindOptions<FileRecord>): Promise<Counted<FileRecord[]>>;

	markForDeleteByStorageLocation(storageLocation: StorageLocation, storageLocationId: EntityId): Promise<number>;

	findBySecurityCheckRequestToken(token: string): Promise<FileRecord>;

	findByCreatorId(creatorId: EntityId): Promise<Counted<FileRecord[]>>;

	save(fileRecord: FileRecord | FileRecord[]): Promise<void>;

	delete(fileRecord: FileRecord | FileRecord[]): Promise<void>;

	getStatisticByParentId(parentId: EntityId): Promise<ParentStatistic>;
}

export const FILE_RECORD_REPO = 'FILE_RECORD_REPO';
