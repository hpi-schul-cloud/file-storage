import { ObjectId } from '@mikro-orm/mongodb';
import { BadRequestException } from '@nestjs/common';
import { fileRecordTestFactory } from '../testing';
import { ErrorType } from './error';
import { CollaboraMimeTypes, FileRecord, PreviewOutputMimeTypes, PreviewStatus } from './file-record.do';
import { FileRecordParentType } from './interface/file-storage-parent-type.enum';
import { ScanStatus } from './vo';

describe('FileRecord', () => {
	describe('exceedsCollaboraEditableFileSize', () => {
		it('should return false if file size is less than collaboraMaxFileSizeInBytes', () => {
			const fileRecord = fileRecordTestFactory().build();
			const maxSize = fileRecord.sizeInByte + 1;

			expect(fileRecord.exceedsCollaboraEditableFileSize(maxSize)).toBe(false);
		});

		it('should return false if file size is equal to collaboraMaxFileSizeInBytes', () => {
			const fileRecord = fileRecordTestFactory().build();
			const maxSize = fileRecord.sizeInByte;

			expect(fileRecord.exceedsCollaboraEditableFileSize(maxSize)).toBe(false);
		});

		it('should return true if file size is greater than collaboraMaxFileSizeInBytes', () => {
			const fileRecord = fileRecordTestFactory().build();
			const maxSize = fileRecord.sizeInByte - 1;

			expect(fileRecord.exceedsCollaboraEditableFileSize(maxSize)).toBe(true);
		});
	});

	describe('isCollaboraEditable', () => {
		describe('when file is blocked', () => {
			it('should return false for collabora editable file', () => {
				const fileRecordDOCX = fileRecordTestFactory()
					.withScanStatus(ScanStatus.BLOCKED)
					.build({ mimeType: CollaboraMimeTypes.DOCX });
				const maxSize = fileRecordDOCX.sizeInByte;

				expect(fileRecordDOCX.isCollaboraEditable(maxSize)).toBe(false);
			});

			it('should return false for a non-collabora editable file', () => {
				const fileRecordWebp = fileRecordTestFactory()
					.withScanStatus(ScanStatus.BLOCKED)
					.build({ mimeType: 'image/webp' });
				const maxSize = fileRecordWebp.sizeInByte;

				expect(fileRecordWebp.isCollaboraEditable(maxSize)).toBe(false);
			});
		});

		describe('when file size exceeds collabora max file size', () => {
			it('should return false for collabora editable file', () => {
				const fileRecordDOCX = fileRecordTestFactory().build({
					mimeType: CollaboraMimeTypes.DOCX,
				});
				const maxSize = fileRecordDOCX.sizeInByte - 1;

				expect(fileRecordDOCX.isCollaboraEditable(maxSize)).toBe(false);
			});

			it('should return false for a non-collabora editable file', () => {
				const fileRecordWebp = fileRecordTestFactory().build({
					mimeType: 'image/webp',
				});
				const maxSize = fileRecordWebp.sizeInByte - 1;

				expect(fileRecordWebp.isCollaboraEditable(maxSize)).toBe(false);
			});
		});

		describe('when file is not blocked and size is within limit', () => {
			it('should return true for all Collabora-supported mime types', () => {
				const collaboraMimeTypes = Object.values(CollaboraMimeTypes);
				for (const mimeType of collaboraMimeTypes) {
					const fileRecord = fileRecordTestFactory().build({ mimeType });
					const maxSize = fileRecord.sizeInByte;

					expect(fileRecord.isCollaboraEditable(maxSize)).toBe(true);
				}
			});

			it('should return false for a non-Collabora mime type', () => {
				const fileRecordPng = fileRecordTestFactory().build({ mimeType: 'image/png' });
				const maxSize = fileRecordPng.sizeInByte;
				expect(fileRecordPng.isCollaboraEditable(maxSize)).toBe(false);

				const fileRecordPdf = fileRecordTestFactory().build({ mimeType: 'application/pdf' });
				expect(fileRecordPdf.isCollaboraEditable(maxSize)).toBe(false);

				const fileRecordMp3 = fileRecordTestFactory().build({ mimeType: 'audio/mpeg' });
				expect(fileRecordMp3.isCollaboraEditable(maxSize)).toBe(false);
			});
		});
	});

	describe('hasDuplicateName', () => {
		const setup = () => {
			const fileRecords = [
				fileRecordTestFactory().build({ name: 'file1.txt' }),
				fileRecordTestFactory().build({ name: 'file2.txt' }),
			];

			return { fileRecords };
		};

		it('should return the file record with a duplicate name', () => {
			const { fileRecords } = setup();

			const duplicate = FileRecord.hasDuplicateName(fileRecords, 'file1.txt');

			expect(duplicate?.getName()).toBe('file1.txt');
		});

		describe('WHEN all fileRecords have different names', () => {
			it('should return undefined', () => {
				const { fileRecords } = setup();

				const duplicate = FileRecord.hasDuplicateName(fileRecords, 'file3.txt');

				expect(duplicate).toBeUndefined();
			});
		});
	});

	describe('resolveFileNameDuplicates', () => {
		const setup = () => {
			const fileRecords = [
				fileRecordTestFactory().build({ name: 'file.txt' }),
				fileRecordTestFactory().build({ name: 'file (1).txt' }),
			];

			return { fileRecords };
		};

		it('should append a counter to resolve duplicate file names', () => {
			const { fileRecords } = setup();

			const resolvedName = FileRecord.resolveFileNameDuplicates(fileRecords, 'file.txt');

			expect(resolvedName).toBe('file (2).txt');
		});
	});

	describe('getFormat', () => {
		it('should return the correct format from a MIME type', () => {
			const mimeType = 'image/jpeg';

			const format = FileRecord.getFormat(mimeType);

			expect(format).toBe('jpeg');
		});

		it('should return the correct format from a MIME type', () => {
			const mimeType = 'image/png';

			const format = FileRecord.getFormat(mimeType);

			expect(format).toBe('png');
		});

		it('should throw an error for invalid MIME types', () => {
			const mimeType = 'image';

			expect(() => FileRecord.getFormat(mimeType)).toThrow(`could not get format from mime type: ${mimeType}`);
		});
	});

	describe('markForDelete', () => {
		describe('WHEN file is unmarked', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().build();
				fileRecord.unmarkForDelete();

				return { fileRecord };
			};

			it('should mark a file record for deletion', () => {
				const { fileRecord } = setup();

				fileRecord.markForDelete();

				expect(fileRecord.getProps().deletedSince).toBeInstanceOf(Date);
			});
		});
	});

	describe('unmarkForDelete', () => {
		describe('WHEN file is marked', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().build();
				fileRecord.markForDelete();

				return { fileRecord };
			};

			it('should unmark a file record for deletion', () => {
				const { fileRecord } = setup();

				fileRecord.unmarkForDelete();

				expect(fileRecord.getProps().deletedSince).toBeUndefined();
			});
		});
	});

	describe('FileRecord.resolveFileNameDuplicates', () => {
		const setup = () => {
			const creatorId = new ObjectId().toHexString();
			const fileRecords = fileRecordTestFactory().buildList(3, { creatorId });

			return { fileRecords, creatorId };
		};

		it('should mark files for delete', () => {
			const { fileRecords, creatorId } = setup();

			const creatorIdsBeforeRemove = fileRecords.map((record) => record.getProps().creatorId);
			expect(creatorIdsBeforeRemove).toEqual([creatorId, creatorId, creatorId]);

			FileRecord.removeCreatorId(fileRecords);

			const creatorIdsAfterRemove = fileRecords.map((record) => record.getProps().creatorId);
			expect(creatorIdsAfterRemove).toEqual([undefined, undefined, undefined]);
		});
	});

	describe('FileRecord.markForDelete', () => {
		const setup = () => {
			const fileRecords = fileRecordTestFactory().buildList(3);

			return { fileRecords };
		};

		it('should mark files for delete', () => {
			const { fileRecords } = setup();

			const deletedSinceBeforeMark = fileRecords.map((record) => record.getProps().deletedSince);
			expect(deletedSinceBeforeMark).toEqual([undefined, undefined, undefined]);

			FileRecord.markForDelete(fileRecords);

			const deletedSinceAfterMark = fileRecords.map((record) => record.getProps().deletedSince);
			expect(deletedSinceAfterMark).toEqual([expect.any(Date), expect.any(Date), expect.any(Date)]);
		});
	});

	describe('FileRecord.unmarkForDelete', () => {
		const setup = () => {
			const fileRecords = fileRecordTestFactory().withDeletedSince().buildList(3);

			return { fileRecords };
		};

		it('should mark files for delete', () => {
			const { fileRecords } = setup();

			const deletedSinceBeforeUnmark = fileRecords.map((record) => record.getProps().deletedSince);
			expect(deletedSinceBeforeUnmark).toEqual([expect.any(Date), expect.any(Date), expect.any(Date)]);

			FileRecord.unmarkForDelete(fileRecords);

			const deletedSinceAfterUnmark = fileRecords.map((record) => record.getProps().deletedSince);
			expect(deletedSinceAfterUnmark).toEqual([undefined, undefined, undefined]);
		});
	});

	describe('setName', () => {
		it('should update the name if a valid name is provided', () => {
			const newName = 'new-name.txt';
			const fileRecord = fileRecordTestFactory().build();

			fileRecord.setName(newName);

			expect(fileRecord.getName()).toBe(newName);
		});

		it('should throw BadRequestException if the name is empty', () => {
			const fileRecord = fileRecordTestFactory().build();

			expect(() => fileRecord.setName('')).toThrow(BadRequestException);
			expect(() => fileRecord.setName('')).toThrow(ErrorType.FILE_NAME_EMPTY);
		});
	});

	describe('createPath', () => {
		const setup = () => {
			const fileRecord = fileRecordTestFactory().build();
			const props = fileRecord.getProps();
			const expectedPath = props.storageLocationId + '/' + fileRecord.id;

			return { fileRecord, expectedPath };
		};

		it('should create path', () => {
			const { fileRecord, expectedPath } = setup();

			const path = fileRecord.createPath();

			expect(path).toBe(expectedPath);
		});
	});

	describe('FileRecord.getPaths', () => {
		it('should return paths for all file records', () => {
			const [fileRecord1, fileRecord2] = fileRecordTestFactory().buildList(2);
			const path1 = fileRecord1.createPath();
			const path2 = fileRecord2.createPath();

			const paths = FileRecord.getPaths([fileRecord1, fileRecord2]);

			expect(paths).toEqual([path1, path2]);
		});
	});

	describe('getPreviewStatus', () => {
		it('should return PREVIEW_POSSIBLE if security check is verified and MIME type is valid', () => {
			const fileRecord = fileRecordTestFactory().withScanStatus(ScanStatus.VERIFIED).build({ mimeType: 'image/png' });

			const status = fileRecord.getPreviewStatus();

			expect(status).toBe(PreviewStatus.PREVIEW_POSSIBLE);
		});

		it('should return PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE if MIME type is invalid', () => {
			const fileRecord = fileRecordTestFactory().build();

			jest.spyOn(fileRecord, 'isPreviewPossible').mockReturnValue(false);

			const status = fileRecord.getPreviewStatus();

			expect(status).toBe(PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE);
		});

		it('should return PREVIEW_NOT_POSSIBLE_SCAN_STATUS_WONT_CHECK if securtiy check status is WONT_CHECK and MIME type is valid', () => {
			const fileRecord = fileRecordTestFactory().withScanStatus(ScanStatus.WONT_CHECK).build({ mimeType: 'image/png' });

			const status = fileRecord.getPreviewStatus();

			expect(status).toBe(PreviewStatus.PREVIEW_NOT_POSSIBLE_SCAN_STATUS_WONT_CHECK);
		});
	});

	describe('getPreviewName', () => {
		const setup = () => {
			const fileRecord = fileRecordTestFactory().build({ name: 'file.txt' });

			return { fileRecord };
		};

		it('should return the original name if no output format is provided', () => {
			const { fileRecord } = setup();

			const previewName = fileRecord.getPreviewName();

			expect(previewName).toBe(fileRecord.getName());
		});

		it('should return the correct preview file name with the specified output format', () => {
			const { fileRecord } = setup();

			const previewName = fileRecord.getPreviewName(PreviewOutputMimeTypes.IMAGE_WEBP);

			expect(previewName).toBe('file.webp');
		});
	});

	describe('setSizeInByte', () => {
		it('should set the size if it is within valid range', () => {
			const fileRecord = fileRecordTestFactory().build();
			const newSize = 2048;
			const maxSize = 4096;

			// Call the function
			// @ts-expect-error test only
			fileRecord.setSizeInByte(newSize, maxSize);

			// Assert the size is updated
			expect(fileRecord.sizeInByte).toBe(newSize);
		});

		it('should throw BadRequestException if size is less than 0', () => {
			const fileRecord = fileRecordTestFactory().build();
			const invalidSize = -1;
			const maxSize = 4096;

			// Assert exception is thrown
			// @ts-expect-error test only
			expect(() => fileRecord.setSizeInByte(invalidSize, maxSize)).toThrow(BadRequestException);
			// @ts-expect-error test only

			expect(() => fileRecord.setSizeInByte(invalidSize, maxSize)).toThrow(ErrorType.FILE_IS_EMPTY);
		});

		it('should throw BadRequestException if size exceeds maxSizeInByte', () => {
			const fileRecord = fileRecordTestFactory().build();
			const invalidSize = 8192;
			const maxSize = 4096;

			// Assert exception is thrown
			// @ts-expect-error test only
			expect(() => fileRecord.setSizeInByte(invalidSize, maxSize)).toThrow(BadRequestException);
			// @ts-expect-error test only
			expect(() => fileRecord.setSizeInByte(invalidSize, maxSize)).toThrow(ErrorType.FILE_TOO_BIG);
		});
	});

	describe('createPreviewFilePath', () => {
		const setup = () => {
			const fileRecord = fileRecordTestFactory().build({ name: 'file.txt' });
			const inputHash = 'randomHash';
			const props = fileRecord.getProps();
			const expectedPath = ['previews', props.storageLocationId, props.id, inputHash].join('/');

			return { fileRecord, inputHash, expectedPath };
		};

		it('should create path', () => {
			const { fileRecord, inputHash, expectedPath } = setup();

			const path = fileRecord.createPreviewFilePath(inputHash);

			expect(path).toBe(expectedPath);
		});
	});

	describe('createPreviewDirectoryPath', () => {
		const setup = () => {
			const fileRecord = fileRecordTestFactory().build({ name: 'file.txt' });
			const props = fileRecord.getProps();
			const expectedPath = ['previews', props.storageLocationId, props.id].join('/');

			return { fileRecord, expectedPath };
		};

		it('should create path', () => {
			const { fileRecord, expectedPath } = setup();

			const path = fileRecord.createPreviewDirectoryPath();

			expect(path).toBe(expectedPath);
		});
	});

	describe('getUniqueParents', () => {
		describe('WHEN filerRecords has parent duplicates', () => {
			it('should return a map with unique parentId as key and parentType as value', () => {
				const [fileRecord1, fileRecord2] = fileRecordTestFactory().buildList(2, {
					parentType: FileRecordParentType.User,
					parentId: 'id1',
				});
				const fileRecord3 = fileRecordTestFactory().build({ parentType: FileRecordParentType.School, parentId: 'id2' });
				const fileRecords = [fileRecord1, fileRecord2, fileRecord3];

				const result = FileRecord.getUniqueParentInfos(fileRecords);

				expect(result.length).toBe(2);
				expect(result[0]).toEqual(fileRecord1.getParentInfo());
				expect(result[1]).toEqual(fileRecord3.getParentInfo());
			});
		});

		describe('WHEN fileRecords is empty', () => {
			it('should return an empty map if fileRecords is empty', () => {
				const result = FileRecord.getUniqueParentInfos([]);

				expect(result.length).toBe(0);
			});
		});
	});

	describe('getName', () => {
		it('should return the name of the file record', () => {
			const name = 'test-file.txt';
			const fileRecord = fileRecordTestFactory().build({ name });

			const result = fileRecord.getName();

			expect(result).toBe(name);
		});
	});

	describe('getMimeType', () => {
		it('should return the mime type of the file record', () => {
			const mimeType = 'image/png';
			const fileRecord = fileRecordTestFactory().build({ mimeType });

			const result = fileRecord.getMimeType();

			expect(result).toBe(mimeType);
		});
	});
});
