import { EntityId } from '@shared/domain/types';
import { Scope } from '@shared/repo/scope';
import { StorageLocation } from '../../domain';
import { FileRecordEntity } from '../file-record.entity';

export class FileRecordScope extends Scope<FileRecordEntity> {
	public byParentId(parentId: EntityId): this {
		this.addQuery({ parentId: parentId });

		return this;
	}

	public byFileRecordId(fileRecordId: EntityId): this {
		this.addQuery({ id: fileRecordId });

		return this;
	}

	public byFileRecordIds(fileRecordIds: EntityId[]): this {
		this.addQuery({ id: { $in: fileRecordIds } });

		return this;
	}

	public byStorageLocation(storageLocation: StorageLocation): this {
		this.addQuery({ storageLocation });

		return this;
	}

	public byStorageLocationId(storageLocationId: EntityId): this {
		this.addQuery({ storageLocationId });

		return this;
	}

	public bySecurityCheckRequestToken(token: string): this {
		this.addQuery({ securityCheck: { requestToken: token } });

		return this;
	}

	public byMarkedForDelete(isMarked = true): this {
		const query = isMarked ? { deletedSince: { $ne: null } } : { deletedSince: null };
		this.addQuery(query);

		return this;
	}

	public byCreatorId(creatorId: EntityId): this {
		this.addQuery({ creatorId: creatorId });

		return this;
	}
}
