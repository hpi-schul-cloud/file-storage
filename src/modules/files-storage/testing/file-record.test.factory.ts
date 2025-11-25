import { ObjectId } from '@mikro-orm/mongodb';
import { DeepPartial } from 'fishery';
import { randomUUID } from 'node:crypto';
import {
	FileRecord,
	FileRecordFactory,
	FileRecordParentType,
	FileRecordProps,
	FileRecordSecurityCheck,
	ParentInfo,
	ScanStatus,
	StorageLocation,
} from '../domain';

class FileRecordTestFactory {
	private sequence = 0;

	props: FileRecordProps = {
		id: new ObjectId().toHexString(),
		size: 100,
		name: `file-record-name #${this.sequence}`,
		mimeType: 'application/octet-stream',
		parentType: FileRecordParentType.Course,
		parentId: new ObjectId().toHexString(),
		creatorId: new ObjectId().toHexString(),
		storageLocationId: new ObjectId().toHexString(),
		storageLocation: StorageLocation.SCHOOL,
		deletedSince: undefined,
		previewGenerationFailed: undefined,
		createdAt: new Date(Date.now() - 1000),
		updatedAt: new Date(Date.now() - 1000),
		contentLastModifiedAt: new Date(Date.now() - 500),
	};

	private securityCheck = FileRecordSecurityCheck.createWithDefaultProps();

	public build(params: DeepPartial<FileRecordProps> = {}): FileRecord {
		const props = { ...this.props, ...params };
		props.id = params.id ?? new ObjectId().toHexString();

		const fileRecord = FileRecordFactory.buildFromFileRecordProps(props, this.securityCheck);

		this.sequence += 1;

		return fileRecord;
	}

	public buildList(number: number, params: DeepPartial<FileRecordProps> = {}): FileRecord[] {
		const fileRecords: FileRecord[] = [];
		for (let i = 0; i < number; i += 1) {
			const fileRecord = this.build(params);
			fileRecords.push(fileRecord);
		}

		return fileRecords;
	}

	public withDeletedSince(date?: Date): this {
		const dateNow = new Date(Date.now() - 1000);
		this.props.deletedSince = date ?? dateNow;

		return this;
	}

	public withScanStatus(scanStatus?: ScanStatus): this {
		this.securityCheck = new FileRecordSecurityCheck({
			status: scanStatus ?? ScanStatus.VERIFIED,
			reason: 'scan-reason',
			requestToken: randomUUID(),
			updatedAt: new Date(Date.now() - 1000),
		});

		return this;
	}

	public withParentInfo(parentInfo: ParentInfo): this {
		this.props.parentId = parentInfo.parentId;
		this.props.parentType = parentInfo.parentType;
		this.props.storageLocationId = parentInfo.storageLocationId;

		return this;
	}

	public asOpenDocument(): this {
		this.props.mimeType = 'application/vnd.oasis.opendocument.text';

		return this;
	}

	public asPdf(): this {
		this.props.mimeType = 'application/pdf';

		return this;
	}

	public asApplicationOctetStream(): this {
		this.props.mimeType = 'application/octet-stream';

		return this;
	}
}

export const fileRecordTestFactory = (): FileRecordTestFactory => new FileRecordTestFactory();
