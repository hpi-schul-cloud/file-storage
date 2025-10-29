import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import { Test, TestingModule } from '@nestjs/testing';
import { FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from '../../files-storage.config';
import { fileRecordTestFactory } from '../../testing';
import { ErrorType } from '../error';
import { FileRecord, FileRecordProps } from '../file-record.do';
import { FILE_RECORD_REPO, FileRecordRepo, StorageLocation } from '../interface';
import { StorageLocationDeleteLoggableException } from '../loggable';
import { FileRecordSecurityCheckProps } from '../vo';
import { FilesStorageService } from './files-storage.service';

describe('FilesStorageService delete methods', () => {
	let module: TestingModule;
	let service: FilesStorageService;
	let fileRecordRepo: DeepMocked<FileRecordRepo>;
	let storageClient: DeepMocked<S3ClientAdapter>;
	let domainErrorHandler: DeepMocked<DomainErrorHandler>;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			providers: [
				FilesStorageService,
				{
					provide: FILES_STORAGE_S3_CONNECTION,
					useValue: createMock<S3ClientAdapter>(),
				},
				{
					provide: FILE_RECORD_REPO,
					useValue: createMock<FileRecordRepo>(),
				},
				{
					provide: Logger,
					useValue: createMock<Logger>(),
				},
				{
					provide: AntivirusService,
					useValue: createMock<AntivirusService>(),
				},
				{
					provide: FileStorageConfig,
					useValue: createMock<FileStorageConfig>(),
				},
				{
					provide: DomainErrorHandler,
					useValue: createMock<DomainErrorHandler>(),
				},
			],
		}).compile();

		service = module.get(FilesStorageService);
		storageClient = module.get(FILES_STORAGE_S3_CONNECTION);
		fileRecordRepo = module.get(FILE_RECORD_REPO);
		domainErrorHandler = module.get(DomainErrorHandler);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	afterAll(async () => {
		await module.close();
	});

	it('service should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('delete is called', () => {
		describe('WHEN valid files exists', () => {
			const setup = () => {
				const fileRecords = [...fileRecordTestFactory().buildList(3)];

				fileRecordRepo.save.mockResolvedValueOnce();

				return { fileRecords };
			};

			it('should call repo save with right parameters', async () => {
				const { fileRecords } = setup();

				await service.deleteFiles(fileRecords);

				const expectedFileRecordProps = fileRecords.map((fileRecord) => {
					const fileRecordProps = fileRecord.getProps();
					const securityCheckProps = fileRecord.getSecurityCheckProps();
					const props: { props: FileRecordProps; securityCheck: FileRecordSecurityCheckProps } = {
						props: fileRecordProps,
						securityCheck: securityCheckProps,
					};

					return props;
				});

				expect(fileRecordRepo.save).toHaveBeenCalledWith(
					expectedFileRecordProps.map(
						(props: { props: FileRecordProps; securityCheck: FileRecordSecurityCheckProps }) =>
							expect.objectContaining({
								props: {
									...props.props,
									deletedSince: expect.any(Date),
								},
								securityCheck: props.securityCheck,
							}) as { props: FileRecordProps; securityCheck: FileRecordSecurityCheckProps }
					)
				);
			});

			it('should call storageClient.moveToTrash', async () => {
				const { fileRecords } = setup();
				const paths = FileRecord.getPaths(fileRecords);

				await service.deleteFiles(fileRecords);

				expect(storageClient.moveToTrash).toHaveBeenCalledWith(paths);
			});
		});

		describe('WHEN repository throw an error', () => {
			const setup = () => {
				const fileRecords = fileRecordTestFactory().buildList(3);

				fileRecordRepo.save.mockRejectedValueOnce(new Error('bla'));

				return { fileRecords };
			};

			it('should pass the error', async () => {
				const { fileRecords } = setup();

				await expect(service.deleteFiles([...fileRecords])).rejects.toThrow(new Error('bla'));
			});
		});

		describe('WHEN filestorage client throw an error', () => {
			const setup = () => {
				const fileRecords = [...fileRecordTestFactory().buildList(3)];

				storageClient.moveToTrash.mockRejectedValueOnce(new Error('bla'));

				return { fileRecords };
			};

			it('should pass error and rollback filerecords', async () => {
				const { fileRecords } = setup();

				await expect(service.deleteFiles(fileRecords)).rejects.toThrow(new Error('bla'));

				FileRecord.markForDelete(fileRecords);
				expect(fileRecordRepo.save).toHaveBeenNthCalledWith(1, fileRecords);
				FileRecord.unmarkForDelete(fileRecords);
				expect(fileRecordRepo.save).toHaveBeenNthCalledWith(2, fileRecords);
			});
		});
	});

	describe('deleteStorageLocationWithAllFiles', () => {
		describe('WHEN valid files exists', () => {
			const setup = () => {
				const storageLocation = StorageLocation.SCHOOL;
				const storageLocationId = new ObjectId().toHexString();
				const params = { storageLocation, storageLocationId };

				fileRecordRepo.markForDeleteByStorageLocation.mockResolvedValueOnce(1);
				storageClient.moveDirectoryToTrash.mockResolvedValueOnce();

				return { storageLocation, storageLocationId, params };
			};

			it('should call fileRecordRepo.markForDeleteByStorageLocation', async () => {
				const { storageLocation, storageLocationId, params } = setup();

				await service.deleteStorageLocationWithAllFiles(params);

				expect(fileRecordRepo.markForDeleteByStorageLocation).toHaveBeenCalledWith(storageLocation, storageLocationId);
			});

			it('should call storageClient.moveDirectoryToTrash', async () => {
				const { storageLocationId, params } = setup();

				await service.deleteStorageLocationWithAllFiles(params);

				expect(storageClient.moveDirectoryToTrash).toHaveBeenCalledWith(storageLocationId);
			});

			it('should return result', async () => {
				const { params } = setup();

				const resultValue = await service.deleteStorageLocationWithAllFiles(params);

				expect(resultValue).toBe(1);
			});
		});

		describe('WHEN storageClient throws an error', () => {
			const setup = () => {
				const storageLocation = StorageLocation.SCHOOL;
				const storageLocationId = new ObjectId().toHexString();
				const params = { storageLocation, storageLocationId };
				const error = new Error('Timeout');

				fileRecordRepo.markForDeleteByStorageLocation.mockResolvedValueOnce(1);
				storageClient.moveDirectoryToTrash.mockRejectedValueOnce(error);

				const expectedProps = [new StorageLocationDeleteLoggableException(params, error)];

				return { storageLocation, storageLocationId, params, expectedProps, error };
			};

			it('should call Logger.error with expected props', async () => {
				const { params, expectedProps } = setup();

				await service.deleteStorageLocationWithAllFiles(params);

				await expect(domainErrorHandler.exec).toHaveBeenCalledWith(...expectedProps);
			});

			it('should call Logger.error with expected props', () => {
				const { params, error } = setup();

				const loggable = new StorageLocationDeleteLoggableException(params, error);
				const message = loggable.getLogMessage();

				expect(message).toBeDefined();
				expect(message.type).toEqual(ErrorType.INTERNAL_SERVER_ERROR_STORAGE_LOCATION_DELETE);
				expect(message.data).toEqual({
					storageLocationId: params.storageLocationId,
					storageLocation: params.storageLocation,
					originalMessage: 'Error while moving directory to trash.',
				});
			});
		});
	});
});
