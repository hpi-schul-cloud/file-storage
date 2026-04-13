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
		this.reAssignIdToAvoidIdLost(fileRecordProps, fileRecordEntity);
		this.runtimeMigration(fileRecordProps);
		const fileRecord = this.createFileRecord(fileRecordProps, securityCheckEmbeddable);
		this.attachDoReferenceToEntityMap(fileRecord, fileRecordEntity);

		return fileRecord;
	}

	private static createFileRecord(
		runtimeCleanFileRecordProps: FileRecordProps,
		securityCheckEmbeddable: FileRecordSecurityCheckEmbeddable
	): FileRecord {
		const securityCheck = new FileRecordSecurityCheck(securityCheckEmbeddable);
		const fileRecord = FileRecordFactory.buildFromFileRecordProps(runtimeCleanFileRecordProps, securityCheck);

		return fileRecord;
	}

	private static reAssignIdToAvoidIdLost(fileRecordProps: FileRecordProps, fileRecordEntity: FileRecordEntity): void {
		fileRecordProps.id = fileRecordEntity.id;
	}

	private static runtimeMigration(fileRecordProps: FileRecordProps): void {
		fileRecordProps.storageType ??= StorageType.STANDARD;
	}

	private static attachDoReferenceToEntityMap(fileRecord: FileRecord, fileRecordEntity: FileRecordEntity): void {
		fileRecordEntity.domainObject = fileRecord;
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
