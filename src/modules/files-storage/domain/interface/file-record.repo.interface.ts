import { FindOptions } from '@shared/domain/interface';
import { Counted, EntityId } from '@shared/domain/types';
import { FileRecord } from '../file-record.do';
import { ParentStatistic } from '../vo';
import { StorageLocation } from './storage-location.enum';

export interface FileRecordRepo {
	findOneById(id: EntityId): Promise<FileRecord>;

	findMultipleById(ids: EntityId[], options?: FindOptions<FileRecord>): Promise<Counted<FileRecord[]>>;

	findOneByIdMarkedForDelete(id: EntityId): Promise<FileRecord>;

	findByParentId(parentId: EntityId, options?: FindOptions<FileRecord>): Promise<Counted<FileRecord[]>>;

	findMarkedForDeleteByParentId(parentId: EntityId, options?: FindOptions<FileRecord>): Promise<Counted<FileRecord[]>>;

	markForDeleteByStorageLocation(storageLocation: StorageLocation, storageLocationId: EntityId): Promise<number>;

	findBySecurityCheckRequestToken(token: string): Promise<FileRecord>;

	findByCreatorId(creatorId: EntityId): Promise<Counted<FileRecord[]>>;

	save(fileRecord: FileRecord | FileRecord[]): Promise<void>;

	delete(fileRecord: FileRecord | FileRecord[]): Promise<void>;

	getStatisticByParentId(parentId: EntityId): Promise<ParentStatistic>;
}

export const FILE_RECORD_REPO = 'FILE_RECORD_REPO';
