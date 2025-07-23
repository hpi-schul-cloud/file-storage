import { EntityId } from '@shared/domain/types';

export interface WopiUser {
	id: EntityId;
	userName: string;
	canWrite: boolean;
}
