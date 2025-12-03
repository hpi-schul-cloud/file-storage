import { FileRecordParentType } from '@modules/files-storage/domain/interface/file-storage-parent-type.enum';
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
	parentType: FileRecordParentType;
}
