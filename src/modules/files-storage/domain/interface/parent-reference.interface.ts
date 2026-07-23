import { type EntityId } from '@shared/domain/types';
import { type FileRecordParentType } from './file-record-parent-type.enum';

export interface ParentReference {
	parentId: EntityId;
	parentType: FileRecordParentType;
}
