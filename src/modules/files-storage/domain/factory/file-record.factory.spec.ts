import { ObjectId } from '@mikro-orm/mongodb';
import { fileRecordTestFactory, ParentInfoTestFactory } from '@modules/files-storage/testing';
import { FileRecordParentType, StorageLocation } from '../interface';
import { StorageType } from '../storage-paths.const';
import { FileRecordSecurityCheck, ScanStatus } from '../vo';
import { FileRecordFactory } from './file-record.factory';

describe('FileRecordFactory', () => {
	describe('buildFromExternalInput', () => {
		describe('when called with required params only', () => {
			const setup = () => {
				const name = 'test-file.txt';
				const mimeType = 'text/plain';
				const params = ParentInfoTestFactory.build();
				const userId = new ObjectId().toHexString();

				return { name, mimeType, params, userId };
			};

			it('should return a FileRecord instance', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result).toBeDefined();
			});

			it('should set the name correctly', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().name).toBe(name);
			});

			it('should set the mimeType correctly', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().mimeType).toBe(mimeType);
			});

			it('should set the parentType from params', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().parentType).toBe(params.parentType);
			});

			it('should set the parentId from params', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().parentId).toBe(params.parentId);
			});

			it('should set the storageLocation from params', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().storageLocation).toBe(params.storageLocation);
			});

			it('should set the storageLocationId from params', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().storageLocationId).toBe(params.storageLocationId);
			});

			it('should set creatorId to the provided userId', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().creatorId).toBe(userId);
			});

			it('should set isUploading to true', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().isUploading).toBe(true);
			});

			it('should set size to 0', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().size).toBe(0);
			});

			it('should generate a non-empty id', () => {
				const { name, mimeType, params, userId } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().id).toBeDefined();
				expect(result.getProps().id).not.toBe('');
			});
		});

		describe('when called with storageType TEMP', () => {
			const setup = () => {
				const name = 'temp-file.png';
				const mimeType = 'image/png';
				const params = ParentInfoTestFactory.build();
				const userId = new ObjectId().toHexString();
				const storageType = StorageType.TEMP;

				return { name, mimeType, params, userId, storageType };
			};

			it('should set storageType to TEMP', () => {
				const { name, mimeType, params, userId, storageType } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, storageType);

				expect(result.getProps().storageType).toBe(StorageType.TEMP);
			});
		});

		describe('when called with explicit STANDARD storageType', () => {
			const setup = () => {
				const name = 'standard-file.pdf';
				const mimeType = 'application/pdf';
				const params = ParentInfoTestFactory.build();
				const userId = new ObjectId().toHexString();
				const storageType = StorageType.STANDARD;

				return { name, mimeType, params, userId, storageType };
			};

			it('should set storageType to STANDARD', () => {
				const { name, mimeType, params, userId, storageType } = setup();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, storageType);

				expect(result.getProps().storageType).toBe(StorageType.STANDARD);
			});
		});

		describe('when called with different parent types', () => {
			it.each([
				FileRecordParentType.Course,
				FileRecordParentType.User,
				FileRecordParentType.Task,
				FileRecordParentType.School,
			])('should set parentType to %s', (parentType) => {
				const name = 'file.txt';
				const mimeType = 'text/plain';
				const params = ParentInfoTestFactory.build({ parentType });
				const userId = new ObjectId().toHexString();

				const result = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result.getProps().parentType).toBe(parentType);
			});
		});

		describe('when called twice', () => {
			const setup = () => {
				const name = 'file.txt';
				const mimeType = 'text/plain';
				const params = ParentInfoTestFactory.build();
				const userId = new ObjectId().toHexString();

				return { name, mimeType, params, userId };
			};

			it('should generate unique ids for each call', () => {
				const { name, mimeType, params, userId } = setup();

				const result1 = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);
				const result2 = FileRecordFactory.buildFromExternalInput(name, mimeType, params, userId, StorageType.STANDARD);

				expect(result1.getProps().id).not.toBe(result2.getProps().id);
			});
		});
	});

	describe('buildFromFileRecordProps', () => {
		describe('when called with valid props and security check', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().build();
				const {
					id,
					size,
					name,
					mimeType,
					parentType,
					parentId,
					creatorId,
					storageLocationId,
					storageLocation,
					storageType,
				} = fileRecord.getProps();
				const securityCheck = FileRecordSecurityCheck.createWithDefaultProps();

				const props = {
					id,
					size,
					name,
					mimeType,
					parentType,
					parentId,
					creatorId,
					storageLocationId,
					storageLocation,
					storageType,
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				return { props, securityCheck };
			};

			it('should return a FileRecord with the given props', () => {
				const { props, securityCheck } = setup();

				const result = FileRecordFactory.buildFromFileRecordProps(props, securityCheck);

				expect(result.getProps()).toMatchObject({
					id: props.id,
					size: props.size,
					name: props.name,
					mimeType: props.mimeType,
					parentType: props.parentType,
					parentId: props.parentId,
					creatorId: props.creatorId,
					storageLocationId: props.storageLocationId,
					storageLocation: props.storageLocation,
				});
			});

			it('should preserve the security check status', () => {
				const { props, securityCheck } = setup();

				const result = FileRecordFactory.buildFromFileRecordProps(props, securityCheck);

				expect(result.getSecurityCheckProps().status).toBe(securityCheck.status);
			});
		});

		describe('when called with storageType in props', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().build();
				const baseProps = fileRecord.getProps();
				const securityCheck = FileRecordSecurityCheck.createWithDefaultProps();

				const props = { ...baseProps, storageType: StorageType.TEMP };

				return { props, securityCheck };
			};

			it('should preserve storageType from props', () => {
				const { props, securityCheck } = setup();

				const result = FileRecordFactory.buildFromFileRecordProps(props, securityCheck);

				expect(result.getProps().storageType).toBe(StorageType.TEMP);
			});
		});
	});

	describe('copy', () => {
		describe('when copying a file record', () => {
			const setup = () => {
				const sourceFileRecord = fileRecordTestFactory().build();
				const userId = new ObjectId().toHexString();
				const targetParentInfo = ParentInfoTestFactory.build({
					storageLocation: StorageLocation.INSTANCE,
					parentType: FileRecordParentType.Course,
				});

				return { sourceFileRecord, userId, targetParentInfo };
			};

			it('should return a new FileRecord', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result).toBeDefined();
			});

			it('should generate a new id different from the source', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().id).not.toBe(sourceFileRecord.getProps().id);
			});

			it('should set isCopyFrom to the source id', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().isCopyFrom).toBe(sourceFileRecord.getProps().id);
			});

			it('should copy the name from source', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().name).toBe(sourceFileRecord.getProps().name);
			});

			it('should copy the mimeType from source', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().mimeType).toBe(sourceFileRecord.getProps().mimeType);
			});

			it('should copy the size from source', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().size).toBe(sourceFileRecord.getProps().size);
			});

			it('should set creatorId to the provided userId', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().creatorId).toBe(userId);
			});

			it('should set parentType from targetParentInfo', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().parentType).toBe(targetParentInfo.parentType);
			});

			it('should set parentId from targetParentInfo', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().parentId).toBe(targetParentInfo.parentId);
			});

			it('should set storageLocation from targetParentInfo', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().storageLocation).toBe(targetParentInfo.storageLocation);
			});

			it('should set storageLocationId from targetParentInfo', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().storageLocationId).toBe(targetParentInfo.storageLocationId);
			});

			it('should set isUploading to undefined', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().isUploading).toBeUndefined();
			});

			it('should copy the storageType from source', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().storageType).toBe(sourceFileRecord.getProps().storageType);
			});
		});

		describe('when source file record has TEMP storageType', () => {
			const setup = () => {
				const sourceFileRecord = fileRecordTestFactory().build({ storageType: StorageType.TEMP });
				const userId = new ObjectId().toHexString();
				const targetParentInfo = ParentInfoTestFactory.build();

				return { sourceFileRecord, userId, targetParentInfo };
			};

			it('should preserve TEMP storageType in copy', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getProps().storageType).toBe(StorageType.TEMP);
			});
		});

		describe('when source file record has a verified security status', () => {
			const setup = () => {
				const sourceFileRecord = fileRecordTestFactory().build();
				sourceFileRecord.updateSecurityCheckStatus(ScanStatus.VERIFIED, 'verified');
				const userId = new ObjectId().toHexString();
				const targetParentInfo = ParentInfoTestFactory.build();

				return { sourceFileRecord, userId, targetParentInfo };
			};

			it('should copy the verified security status', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getSecurityCheckProps().status).toBe(ScanStatus.VERIFIED);
			});
		});

		describe('when source file record has a blocked security status', () => {
			const setup = () => {
				const sourceFileRecord = fileRecordTestFactory().build();
				sourceFileRecord.updateSecurityCheckStatus(ScanStatus.BLOCKED, 'blocked');
				const userId = new ObjectId().toHexString();
				const targetParentInfo = ParentInfoTestFactory.build();

				return { sourceFileRecord, userId, targetParentInfo };
			};

			it('should reset security check to PENDING for non-verified status', () => {
				const { sourceFileRecord, userId, targetParentInfo } = setup();

				const result = FileRecordFactory.copy(sourceFileRecord, userId, targetParentInfo);

				expect(result.getSecurityCheckProps().status).toBe(ScanStatus.PENDING);
			});
		});
	});
});
