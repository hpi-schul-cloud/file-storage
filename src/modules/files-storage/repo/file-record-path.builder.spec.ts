import { StorageType } from '../domain';
import { fileRecordTestFactory } from '../testing';
import { FileRecordPathBuilder, STORAGE_TYPE_FOLDER_MAP, TEMP_STORAGE_FOLDER } from './file-record-path.builder';

describe('FileRecordPathBuilder', () => {
	describe('STORAGE_TYPE_FOLDER_MAP', () => {
		it('should map StorageType.TEMP to TEMP_STORAGE_FOLDER', () => {
			expect(STORAGE_TYPE_FOLDER_MAP[StorageType.TEMP]).toBe(TEMP_STORAGE_FOLDER);
		});
	});

	describe('build', () => {
		describe('when storageType is STANDARD', () => {
			it('should return path without a folder prefix', () => {
				const fileRecord = fileRecordTestFactory().build({ storageType: StorageType.STANDARD });
				const { storageLocationId } = fileRecord.getProps();

				const result = FileRecordPathBuilder.build(fileRecord);

				expect(result).toBe(`${storageLocationId}/${fileRecord.id}`);
			});
		});

		describe('when storageType is TEMP', () => {
			it('should return path prefixed with the temp folder name', () => {
				const fileRecord = fileRecordTestFactory().build({ storageType: StorageType.TEMP });
				const { storageLocationId } = fileRecord.getProps();
				const folder = STORAGE_TYPE_FOLDER_MAP[StorageType.TEMP];

				const result = FileRecordPathBuilder.build(fileRecord);

				expect(result).toBe(`${folder}/${storageLocationId}/${fileRecord.id}`);
			});
		});

		describe('when storageType is undefined', () => {
			it('should return path without a folder prefix', () => {
				const fileRecord = fileRecordTestFactory().build({ storageType: undefined });
				const { storageLocationId } = fileRecord.getProps();

				const result = FileRecordPathBuilder.build(fileRecord);

				expect(result).toBe(`${storageLocationId}/${fileRecord.id}`);
			});
		});
	});

	describe('buildAll', () => {
		it('should return paths for all file records', () => {
			const [fileRecord1, fileRecord2] = fileRecordTestFactory().buildList(2);

			const paths = FileRecordPathBuilder.buildAll([fileRecord1, fileRecord2]);

			expect(paths).toEqual([FileRecordPathBuilder.build(fileRecord1), FileRecordPathBuilder.build(fileRecord2)]);
		});
	});
});
