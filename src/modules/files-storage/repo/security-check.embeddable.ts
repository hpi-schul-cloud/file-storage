import { Embeddable, Enum, Property } from '@mikro-orm/mongodb';
import { FileRecordSecurityCheckProps, ScanStatus } from '../domain';

@Embeddable()
export class FileRecordSecurityCheckEmbeddable implements FileRecordSecurityCheckProps {
	@Enum(() => ScanStatus)
	status!: ScanStatus;

	@Property()
	reason!: string;

	@Property({ nullable: true })
	requestToken?: string;

	@Property()
	createdAt = new Date();

	@Property()
	updatedAt!: Date;
}
