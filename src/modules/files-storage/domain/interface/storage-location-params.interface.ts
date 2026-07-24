import { type EntityId } from '@shared/domain/types';
import { type StorageLocation } from './storage-location.enum';

export interface StorageLocationParams {
	storageLocationId: EntityId;
	storageLocation: StorageLocation;
}
