import { Embedded, Entity, Enum, Index, Property } from '@mikro-orm/mongodb';
import { BaseEntityWithTimestamps } from '@shared/domain/entity/base.entity';
import { EntityId } from '@shared/domain/types';
import { ObjectIdType } from '@shared/repo/types/object-id.type';
import { FileRecord, FileRecordProps } from '../domain';
import { FileRecordParentType, StorageLocation } from '../domain/interface';
import { FileRecordSecurityCheckEmbeddable } from './security-check.embeddable';

/**
 * Note: The file record entity will not manage any entity relations by itself.
 * That's why we do not map any relations in the entity class
 * and instead just use the plain object ids.
 */
@Entity({ tableName: 'filerecords' })
@Index({ properties: ['storageLocation', 'storageLocationId'], options: { background: true } })
// https://github.com/mikro-orm/mikro-orm/issues/1230
@Index({ options: { 'securityCheck.requestToken': 1 } })
@Index({
	name: 'isUploading_ttl_idx',
	properties: ['createdAt'],
	options: {
		expireAfterSeconds: 86400, // 24 Stunden
		partialFilterExpression: { isUploading: true },
	},
})
export class FileRecordEntity extends BaseEntityWithTimestamps implements FileRecordProps {
	@Index({ options: { expireAfterSeconds: 7 * 24 * 60 * 60 } })
	@Property({ nullable: true })
	deletedSince?: Date;

	@Property({ nullable: true })
	contentLastModifiedAt?: Date;

	@Property()
	size!: number;

	@Property()
	name!: string;

	@Property()
	mimeType!: string;

	@Embedded(() => FileRecordSecurityCheckEmbeddable, { object: true, nullable: false })
	securityCheck!: FileRecordSecurityCheckEmbeddable;

	@Index()
	@Enum(() => FileRecordParentType)
	parentType!: FileRecordParentType;

	@Property({ nullable: true })
	isUploading?: boolean;

	@Property({ nullable: true })
	previewGenerationFailed?: boolean;

	@Index()
	@Property({ type: ObjectIdType, fieldName: 'parent', nullable: false })
	parentId!: EntityId;

	@Index()
	@Property({ type: ObjectIdType, fieldName: 'creator', nullable: true })
	creatorId?: EntityId;

	@Property({ type: ObjectIdType, fieldName: 'storageLocationId', nullable: false })
	storageLocationId!: EntityId;

	@Property({ type: 'StorageLocation' })
	storageLocation!: StorageLocation;

	@Property({ type: ObjectIdType, fieldName: 'isCopyFrom', nullable: true })
	isCopyFrom?: EntityId;

	@Property({ persist: false })
	domainObject: FileRecord | undefined;
}
