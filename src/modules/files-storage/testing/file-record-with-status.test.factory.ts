import { FileRecordWithStatus } from '../domain/interface/file-record-status.interface';
import { fileRecordStatusTestFactory } from './file-record-status.test.factory';
import { fileRecordTestFactory } from './file-record.test.factory';

type FileRecordFactory = ReturnType<typeof fileRecordTestFactory>;
type FileRecordStatusFactory = ReturnType<typeof fileRecordStatusTestFactory>;
type FileRecordBuildOverrides = Partial<Parameters<FileRecordFactory['build']>[0]>;
type FileRecordStatusBuildResult = Partial<ReturnType<FileRecordStatusFactory['build']>>;

export class FileRecordWithStatusTestFactory {
	private readonly fileRecordFactory = fileRecordTestFactory();
	private readonly fileRecordStatusFactory = fileRecordStatusTestFactory();

	public build(
		overrides?: Partial<{
			fileRecord: FileRecordBuildOverrides;
			status: FileRecordStatusBuildResult;
		}>
	): FileRecordWithStatus {
		const fileRecord = this.fileRecordFactory.build(overrides?.fileRecord);
		const status = { ...this.fileRecordStatusFactory.build(), ...overrides?.status };

		return { fileRecord, status };
	}

	public buildList(
		count: number,
		overrides?: Partial<{
			fileRecord: FileRecordBuildOverrides;
			status: FileRecordStatusBuildResult;
		}>
	): FileRecordWithStatus[] {
		const list: FileRecordWithStatus[] = [];

		for (let i = 0; i < count; i += 1) {
			list.push(this.build(overrides));
		}

		return list;
	}
}

export const fileRecordWithStatusTestFactory = (): FileRecordWithStatusTestFactory =>
	new FileRecordWithStatusTestFactory();
