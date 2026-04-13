import { EntityManager } from '@mikro-orm/mongodb';
import { FileRecord, FileRecordFactory, FileRecordProps, FileRecordSecurityCheck, StorageType } from '../../domain';
import { FileRecordEntity } from '../file-record.entity';
import { FileRecordSecurityCheckEmbeddable } from '../security-check.embeddable';

export class FileRecordEntityMapper {
	public static mapEntityToDo(fileRecordEntity: FileRecordEntity): FileRecord {
		// check identity map reference
		if (fileRecordEntity.domainObject) {
			return fileRecordEntity.domainObject;
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { securityCheck: securityCheckEmbeddable, domainObject, ...fileRecordProps } = fileRecordEntity;
		// we need to "copy" the "id" property manually, as otherwise the "id" will get lost
		fileRecordProps.id = fileRecordEntity.id;
		this.runtimeMigration(fileRecordProps);
		const securityCheck = new FileRecordSecurityCheck(securityCheckEmbeddable);
		// It is very important to hand over "fileRecordProps" CLEAN (meaning no additional properties)!!!
		const fileRecord = FileRecordFactory.buildFromFileRecordProps(fileRecordProps, securityCheck);

		// attach to identity map
		fileRecordEntity.domainObject = fileRecord;

		return fileRecord;
	}

	private static runtimeMigration(fileRecordProps: FileRecordProps): void {
		fileRecordProps.storageType ??= StorageType.STANDARD;
	}

	public static mapDoToEntity(em: EntityManager, fileRecord: FileRecord): FileRecordEntity {
		const props = fileRecord.getProps();
		const { ...restProps } = props;

		const entity =
			em.getUnitOfWork().getById<FileRecordEntity>(FileRecordEntity.name, props.id) ?? new FileRecordEntity();
		em.assign(entity, { ...restProps });

		entity.securityCheck = FileRecordEntityMapper.mapDoToEmbeddable(em, fileRecord);

		return entity;
	}

	private static mapDoToEmbeddable(em: EntityManager, fileRecord: FileRecord): FileRecordSecurityCheckEmbeddable {
		const securityCheckProps = fileRecord.getSecurityCheckProps();

		const embeddable = new FileRecordSecurityCheckEmbeddable();
		em.assign(embeddable, securityCheckProps);

		return embeddable;
	}
}
