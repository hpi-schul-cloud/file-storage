import { EntityId } from '@shared/domain/types';

/**
 * Base interface for parameters that reference a file record
 */
export interface FileRecordIdentifier {
	fileRecordId: EntityId;
}

/**
 * Interface for parameters that reference multiple file records
 */
export interface MultipleFileRecordIdentifier {
	fileRecordIds: EntityId[];
}

/**
 * Interface for parameters that reference a parent entity
 */
export interface ParentIdentifier {
	parentId: EntityId;
	// Only the keys of ParentIdentifier interface are used in the RequestLoggingLoggable class, so we can allow any type for parentType here without affecting type safety in that context.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parentType: any;
}
