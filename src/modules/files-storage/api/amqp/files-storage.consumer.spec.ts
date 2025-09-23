import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Logger } from '@infra/logger';
import { MikroORM, ObjectId } from '@mikro-orm/mongodb';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityId } from '@shared/domain/types';
import { setupEntities } from '@testing/database';
import { FileRecordParentType, FilesStorageService, PreviewService, StorageLocation } from '../../domain';
import { ENTITIES } from '../../files-storage.entity.imports';
import { fileRecordTestFactory, fileRecordWithStatusTestFactory } from '../../testing';
import { CopyFilesOfParentPayload } from '../dto';
import { FileRecordConsumerResponse } from './dto';
import { FilesStorageConsumer } from './files-storage.consumer';

describe('FilesStorageConsumer', () => {
	let module: TestingModule;
	let filesStorageService: DeepMocked<FilesStorageService>;
	let previewService: DeepMocked<PreviewService>;
	let service: FilesStorageConsumer;

	afterEach(() => {
		jest.resetAllMocks();
	});

	afterAll(async () => {
		await module.close();
	});

	beforeAll(async () => {
		module = await Test.createTestingModule({
			providers: [
				FilesStorageConsumer,
				{
					provide: FilesStorageService,
					useValue: createMock<FilesStorageService>(),
				},
				{
					provide: PreviewService,
					useValue: createMock<PreviewService>(),
				},
				{
					provide: Logger,
					useValue: createMock<Logger>(),
				},
				{
					provide: MikroORM,
					useValue: await setupEntities(ENTITIES),
				},
			],
		}).compile();

		filesStorageService = module.get(FilesStorageService);
		previewService = module.get(PreviewService);
		service = module.get(FilesStorageConsumer);
	});

	describe('copyFilesOfParent()', () => {
		const storageLocationId: EntityId = new ObjectId().toHexString();
		describe('WHEN valid file exists', () => {
			it('should call filesStorageService.copyFilesOfParent with params', async () => {
				const payload: CopyFilesOfParentPayload = {
					userId: new ObjectId().toHexString(),
					source: {
						parentId: new ObjectId().toHexString(),
						parentType: FileRecordParentType.Course,
						storageLocationId,
						storageLocation: StorageLocation.SCHOOL,
					},
					target: {
						parentId: new ObjectId().toHexString(),
						parentType: FileRecordParentType.Course,
						storageLocationId,
						storageLocation: StorageLocation.SCHOOL,
					},
				};
				await service.copyFilesOfParent(payload);
				expect(filesStorageService.copyFilesOfParent).toBeCalledWith(payload.userId, payload.source, payload.target);
			});
			it('regular RPC handler should receive a valid RPC response', async () => {
				const sourceCourseId = new ObjectId().toHexString();
				const targetCourseId = new ObjectId().toHexString();

				const payload: CopyFilesOfParentPayload = {
					userId: new ObjectId().toHexString(),
					source: {
						parentId: sourceCourseId,
						parentType: FileRecordParentType.Course,
						storageLocationId,
						storageLocation: StorageLocation.SCHOOL,
					},
					target: {
						parentId: targetCourseId,
						parentType: FileRecordParentType.Course,
						storageLocationId,
						storageLocation: StorageLocation.SCHOOL,
					},
				};
				const responseData = [{ id: '1', sourceId: '2', name: 'test.txt' }];
				filesStorageService.copyFilesOfParent.mockResolvedValueOnce([responseData, responseData.length]);
				const response = await service.copyFilesOfParent(payload);
				expect(response.message).toEqual(responseData);
			});
		});
		describe('WHEN file not exists', () => {
			it('should return RpcMessage with empty array', async () => {
				const sourceCourseId = new ObjectId().toHexString();
				const targetCourseId = new ObjectId().toHexString();
				const payload = {
					userId: new ObjectId().toHexString(),
					source: {
						parentId: sourceCourseId,
						parentType: FileRecordParentType.Course,
						storageLocationId,
						storageLocation: StorageLocation.SCHOOL,
					},
					target: {
						parentId: targetCourseId,
						parentType: FileRecordParentType.Course,
						storageLocationId,
						storageLocation: StorageLocation.SCHOOL,
					},
				};
				filesStorageService.copyFilesOfParent.mockResolvedValueOnce([[], 0]);
				const response = await service.copyFilesOfParent(payload);
				expect(response.message).toEqual([]);
			});
		});
	});

	describe('getFilesOfParent()', () => {
		describe('WHEN valid file exists', () => {
			it('should call filesStorageService.getFileRecordsOfParent and filesStorageService.getFileRecordsWithStatus with params', async () => {
				const parentId = new ObjectId().toHexString();
				filesStorageService.getFileRecordsOfParent.mockResolvedValueOnce([[], 0]);

				await service.getFilesOfParent(parentId);

				expect(filesStorageService.getFileRecordsOfParent).toHaveBeenCalledWith(parentId);
			});

			it('should return array instances of FileRecordConsumerResponse', async () => {
				const parentId = new ObjectId().toHexString();

				const fileRecords = fileRecordTestFactory().buildList(3, {
					parentId,
				});
				const fileRecordsWithStatus = fileRecordWithStatusTestFactory().buildList(3);

				filesStorageService.getFileRecordsOfParent.mockResolvedValueOnce([fileRecords, fileRecords.length]);
				filesStorageService.getFileRecordsWithStatus.mockReturnValueOnce(fileRecordsWithStatus);

				const response = await service.getFilesOfParent(parentId);

				expect(response.message[0]).toBeInstanceOf(FileRecordConsumerResponse);
			});
		});

		describe('WHEN file not exists', () => {
			it('should return RpcMessage with empty array', async () => {
				const parentId = new ObjectId().toHexString();

				filesStorageService.getFileRecordsOfParent.mockResolvedValueOnce([[], 0]);
				filesStorageService.getFileRecordsWithStatus.mockReturnValueOnce([]);

				const response = await service.getFilesOfParent(parentId);
				expect(response).toStrictEqual({ message: [] });
			});
		});
	});

	describe('deleteFilesOfParent()', () => {
		describe('WHEN valid file exists', () => {
			const setup = () => {
				const parentId = new ObjectId().toHexString();

				const fileRecords = fileRecordTestFactory().buildList(3);
				filesStorageService.getFileRecordsOfParent.mockResolvedValueOnce([fileRecords, fileRecords.length]);

				return { parentId, fileRecords };
			};

			it('should call filesStorageService.deleteFilesOfParent with params', async () => {
				const { parentId } = setup();

				await service.deleteFilesOfParent(parentId);

				expect(filesStorageService.getFileRecordsOfParent).toHaveBeenCalledWith(parentId);
			});

			it('should call previewService.deletePreviews with params', async () => {
				const { parentId, fileRecords } = setup();

				await service.deleteFilesOfParent(parentId);

				expect(previewService.deletePreviews).toHaveBeenCalledWith(fileRecords);
			});

			it('should call filesStorageService.deleteFilesOfParent with params', async () => {
				const { parentId, fileRecords } = setup();

				await service.deleteFilesOfParent(parentId);

				expect(filesStorageService.deleteFilesOfParent).toHaveBeenCalledWith(fileRecords);
			});

			it('should return array instances of FileRecordResponse', async () => {
				const { parentId } = setup();

				const response = await service.deleteFilesOfParent(parentId);

				expect(response.message[0]).toBeInstanceOf(FileRecordConsumerResponse);
			});
		});

		describe('WHEN no file exists', () => {
			const setup = () => {
				const parentId = new ObjectId().toHexString();

				filesStorageService.getFileRecordsOfParent.mockResolvedValueOnce([[], 0]);
				filesStorageService.getFileRecordsWithStatus.mockReturnValueOnce([]);

				return { parentId };
			};

			it('should return RpcMessage with empty array', async () => {
				const { parentId } = setup();

				const response = await service.deleteFilesOfParent(parentId);

				expect(response).toStrictEqual({ message: [] });
			});
		});
	});

	describe('deleteFiles()', () => {
		describe('WHEN valid file exists', () => {
			const setup = () => {
				const recordId = new ObjectId().toHexString();

				const fileRecord = fileRecordTestFactory().build();
				filesStorageService.getFileRecord.mockResolvedValueOnce(fileRecord);

				return { recordId, fileRecord };
			};

			it('should call previewService.deletePreviews with params', async () => {
				const { recordId, fileRecord } = setup();

				await service.deleteFiles([recordId]);

				expect(previewService.deletePreviews).toHaveBeenCalledWith([fileRecord]);
			});

			it('should call filesStorageService.deleteFiles with params', async () => {
				const { recordId, fileRecord } = setup();

				await service.deleteFiles([recordId]);

				const result = [fileRecord];
				expect(filesStorageService.getFileRecord).toHaveBeenCalledWith(recordId);
				expect(filesStorageService.delete).toHaveBeenCalledWith(result);
			});

			it('should return array instances of FileRecordResponse', async () => {
				const { recordId } = setup();

				const response = await service.deleteFiles([recordId]);

				expect(response.message[0]).toBeInstanceOf(FileRecordConsumerResponse);
			});
		});

		describe('WHEN no file exists', () => {
			const setup = () => {
				const recordId = new ObjectId().toHexString();

				filesStorageService.getFileRecord.mockRejectedValueOnce(new Error('not found'));

				return { recordId };
			};

			it('should throw', async () => {
				const { recordId } = setup();

				await expect(service.deleteFiles([recordId])).rejects.toThrow('not found');
			});
		});
	});

	describe('removeCreatorIdFromFileRecords()', () => {
		describe('WHEN valid file exists', () => {
			const setup = () => {
				const creatorId = new ObjectId().toHexString();

				const fileRecords = fileRecordTestFactory().buildList(3, { creatorId });
				filesStorageService.getFileRecordsByCreatorId.mockResolvedValueOnce([fileRecords, fileRecords.length]);

				const fileRecordsWithStatus = fileRecordWithStatusTestFactory().buildList(3);
				filesStorageService.getFileRecordsWithStatus.mockReturnValueOnce(fileRecordsWithStatus);

				return { creatorId, fileRecords };
			};

			it('should called removing all ids of passed creator from fileRecords', async () => {
				const { creatorId, fileRecords } = setup();

				await service.removeCreatorIdFromFileRecords(creatorId);

				expect(filesStorageService.getFileRecordsByCreatorId).toHaveBeenCalledWith(creatorId);
				expect(filesStorageService.removeCreatorIdFromFileRecords).toHaveBeenCalledWith(fileRecords);
			});

			it('should return correct type', async () => {
				const { creatorId, fileRecords } = setup();

				const result = await service.removeCreatorIdFromFileRecords(creatorId);

				expect(result.message).toHaveLength(fileRecords.length);
				expect(Object.keys(result.message[0])).toEqual(
					expect.arrayContaining([
						'id',
						'name',
						'parentId',
						'creatorId',
						'parentType',
						'isUploading',
						'deletedSince',
						'createdAt',
						'updatedAt',
					])
				);
			});
		});

		describe('WHEN no file exists', () => {
			const setup = () => {
				const creatorId = new ObjectId().toHexString();

				filesStorageService.getFileRecordsByCreatorId.mockResolvedValueOnce([[], 0]);
				filesStorageService.getFileRecordsWithStatus.mockReturnValueOnce([]);

				return { creatorId };
			};

			it('should return RpcMessage with empty array', async () => {
				const { creatorId } = setup();

				const response = await service.removeCreatorIdFromFileRecords(creatorId);

				expect(response).toStrictEqual({ message: [] });
			});
		});
	});
});
