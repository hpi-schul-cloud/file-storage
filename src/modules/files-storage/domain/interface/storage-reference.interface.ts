import { type EntityId } from '@shared/domain/types';
import { type StorageType } from '../storage-paths.const';
import { type StorageLocation } from './storage-location.enum';

export interface StorageReference {
	storageLocationId: EntityId;
	storageLocation: StorageLocation;
	storageType: StorageType;
}
