import { ObjectId } from '@mikro-orm/mongodb';
import { EntityId } from '@shared/domain/types';
import { Scope } from '@shared/repo/scope';
import { StorageLocation } from '../../domain';
import { FileRecordEntity } from '../file-record.entity';

export class FileRecordScope extends Scope<FileRecordEntity> {
	public byParentId(parentId: EntityId): FileRecordScope {
		this.addQuery({ parentId: parentId });

		return this;
	}

	public byFileRecordId(fileRecordId: EntityId): FileRecordScope {
		this.addQuery({ id: fileRecordId });

		return this;
	}

	public byFileRecordIds(fileRecordIds: EntityId[]): FileRecordScope {
		this.addQuery({ id: { $in: fileRecordIds } });

		return this;
	}

	public byStorageLocation(storageLocation: StorageLocation): FileRecordScope {
		this.addQuery({ storageLocation });

		return this;
	}

	public byStorageLocationId(storageLocationId: EntityId): FileRecordScope {
		//@ts-expect-error @TODO FIXME
		this.addQuery({ storageLocationId: new ObjectId(storageLocationId) });

		return this;
	}

	public bySecurityCheckRequestToken(token: string): FileRecordScope {
		this.addQuery({ securityCheck: { requestToken: token } });

		return this;
	}

	public byMarkedForDelete(isMarked = true): FileRecordScope {
		const query = isMarked ? { deletedSince: { $ne: null } } : { deletedSince: null };
		this.addQuery(query);

		return this;
	}

	public byCreatorId(creatorId: EntityId): FileRecordScope {
		this.addQuery({ creatorId: creatorId });

		return this;
	}
}
