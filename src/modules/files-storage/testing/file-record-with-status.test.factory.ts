import { FileRecord } from '../domain';
import { FileRecordStatus } from '../domain/interface/file-record-status.interface';
import { fileRecordStatusTestFactory } from './file-record-status.test.factory';
import { fileRecordTestFactory } from './file-record.test.factory';

export class FileRecordWithStatusTestFactory {
	private fileRecordFactory = fileRecordTestFactory();
	private fileRecordStatusFactory = fileRecordStatusTestFactory();

	public build(
		overrides?: Partial<{
			fileRecord: Partial<Parameters<typeof this.fileRecordFactory.build>[0]>;
			status: Partial<ReturnType<typeof this.fileRecordStatusFactory.build>>;
		}>
	): { fileRecord: FileRecord; status: FileRecordStatus } {
		const fileRecord = this.fileRecordFactory.build(overrides?.fileRecord);
		const status = { ...this.fileRecordStatusFactory.build(), ...overrides?.status };

		return { fileRecord, status };
	}

	public buildList(
		count: number,
		overrides?: Partial<{
			fileRecord: Partial<Parameters<typeof this.fileRecordFactory.build>[0]>;
			status: Partial<ReturnType<typeof this.fileRecordStatusFactory.build>>;
		}>
	): { fileRecord: FileRecord; status: FileRecordStatus }[] {
		const list: { fileRecord: FileRecord; status: FileRecordStatus }[] = [];

		for (let i = 0; i < count; i += 1) {
			list.push(this.build(overrides));
		}

		return list;
	}
}

export const fileRecordWithStatusTestFactory = (): FileRecordWithStatusTestFactory =>
	new FileRecordWithStatusTestFactory();
