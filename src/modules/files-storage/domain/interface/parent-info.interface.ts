import { EntityId } from '@shared/domain/types';
import { ParentReference } from '../file-record.do';
import { StorageLocation } from './storage-location.enum';

export interface ParentInfo extends ParentReference {
	storageLocationId: EntityId;
	storageLocation: StorageLocation;
}
