import { fileRecordTestFactory } from '@modules/files-storage/testing';
import { StorageFolders, StorageType } from '../storage-paths';
import { FilePathFactory } from './file-path.factory';

describe('FilePathFactory', () => {
	describe('StorageFolders', () => {
		it('should map StorageType.TEMP to TEMP_STORAGE_FOLDER', () => {
			expect(StorageFolders[StorageType.TEMP]).toBe(StorageFolders[StorageType.TEMP]);
		});
	});

	describe('build', () => {
		describe('when storageType is STANDARD', () => {
			it('should return path without a folder prefix', () => {
				const fileRecord = fileRecordTestFactory().build({ storageType: StorageType.STANDARD });
				const { storageLocationId } = fileRecord.getProps();

				const result = FilePathFactory.create(fileRecord);

				expect(result).toBe(`${storageLocationId}/${fileRecord.id}`);
			});
		});

		describe('when storageType is TEMP', () => {
			it('should return path prefixed with the temp folder name', () => {
				const fileRecord = fileRecordTestFactory().build({ storageType: StorageType.TEMP });
				const { storageLocationId } = fileRecord.getProps();
				const folder = StorageFolders[StorageType.TEMP];

				const result = FilePathFactory.create(fileRecord);

				expect(result).toBe(`${folder}/${storageLocationId}/${fileRecord.id}`);
			});
		});

		describe('when storageType is undefined', () => {
			it('should return path without a folder prefix', () => {
				const fileRecord = fileRecordTestFactory().build({ storageType: undefined });
				const { storageLocationId } = fileRecord.getProps();

				const result = FilePathFactory.create(fileRecord);

				expect(result).toBe(`${storageLocationId}/${fileRecord.id}`);
			});
		});
	});

	describe('createMany', () => {
		it('should return paths for all file records', () => {
			const [fileRecord1, fileRecord2] = fileRecordTestFactory().buildList(2);

			const paths = FilePathFactory.createMany([fileRecord1, fileRecord2]);

			expect(paths).toEqual([FilePathFactory.create(fileRecord1), FilePathFactory.create(fileRecord2)]);
		});
	});

	describe('createPreviewDirectory', () => {
		it('should build preview directory path from file record', () => {
			const fileRecord = fileRecordTestFactory().build();
			const { storageLocationId } = fileRecord.getProps();
			const expectedPath = ['previews', storageLocationId, fileRecord.id].join('/');

			const result = FilePathFactory.createPreviewDirectory(fileRecord);

			expect(result).toBe(expectedPath);
		});
	});

	describe('createPreview', () => {
		it('should build preview file path from file record and hash', () => {
			const fileRecord = fileRecordTestFactory().build();
			const { storageLocationId } = fileRecord.getProps();
			const hash = 'randomHash';
			const expectedPath = ['previews', storageLocationId, fileRecord.id, hash].join('/');

			const result = FilePathFactory.createPreview(fileRecord, hash);

			expect(result).toBe(expectedPath);
		});
	});
});
