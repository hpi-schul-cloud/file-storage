import { EntityFactory } from '@testing/factory/entity.factory';
import { randomUUID } from 'node:crypto';
import { FileRecordSecurityCheckProps, ScanStatus } from '../domain';
import { FileRecordSecurityCheckEmbeddable } from '../repo/file-record.entity';

export const fileRecordSecurityCheckEmbeddableFactory = EntityFactory.define<
	FileRecordSecurityCheckEmbeddable,
	FileRecordSecurityCheckProps
>(FileRecordSecurityCheckEmbeddable, () => {
	const embeddable: FileRecordSecurityCheckEmbeddable = {
		status: ScanStatus.PENDING,
		reason: `not yet scanned`,
		requestToken: randomUUID(),
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	return embeddable;
});
