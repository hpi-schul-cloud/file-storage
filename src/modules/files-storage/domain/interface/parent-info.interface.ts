import { type EntityId } from '@shared/domain/types';
import { type ParentReference } from '../file-record.do';
import { type StorageLocation } from './storage-location.enum';

export interface ParentInfo extends ParentReference {
	storageLocationId: EntityId;
	storageLocation: StorageLocation;
}
