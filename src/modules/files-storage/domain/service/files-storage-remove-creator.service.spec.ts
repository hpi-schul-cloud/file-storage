import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { S3ClientAdapter } from '@infra/s3-client';
import { Test, TestingModule } from '@nestjs/testing';
import { FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from '../../files-storage.config';
import { fileRecordTestFactory } from '../../testing';
import { FileRecord } from '../file-record.do';
import { FILE_RECORD_REPO, FileRecordRepo } from '../interface';
import { FilesStorageService } from './files-storage.service';

describe('FilesStorageService delete methods', () => {
	let module: TestingModule;
	let service: FilesStorageService;
	let fileRecordRepo: DeepMocked<FileRecordRepo>;

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
		fileRecordRepo = module.get(FILE_RECORD_REPO);
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

	describe('removeCreatorIdFromFileRecord is called', () => {
		describe('WHEN valid files exists', () => {
			const setup = () => {
				const fileRecords = fileRecordTestFactory().buildList(3);

				fileRecordRepo.findByCreatorId.mockResolvedValueOnce([fileRecords, fileRecords.length]);
				const spy = jest.spyOn(FileRecord, 'removeCreatorId');

				return { fileRecords, spy };
			};

			it('should call removing creatorId and save the result.', async () => {
				const { fileRecords, spy } = setup();

				await service.removeCreatorIdFromFileRecords(fileRecords);

				expect(spy).toBeCalledWith(fileRecords);
				expect(fileRecordRepo.save).toHaveBeenCalledWith(fileRecords);
			});

			it('should return updated fileRecords', async () => {
				const { fileRecords } = setup();

				const result = await service.removeCreatorIdFromFileRecords(fileRecords);

				expect(result).toEqual(undefined);
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

				await expect(service.delete(fileRecords)).rejects.toThrow(new Error('bla'));
			});
		});
	});
});
