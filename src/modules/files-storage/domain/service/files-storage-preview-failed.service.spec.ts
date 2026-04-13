import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import { Test, TestingModule } from '@nestjs/testing';
import { FILE_STORAGE_CONFIG_TOKEN, FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from '../../files-storage.config';
import { fileRecordTestFactory } from '../../testing';
import { FILE_RECORD_REPO, FileRecordRepo } from '../interface';
import { FilesStorageService } from './files-storage.service';

const buildFileRecord = () => {
	const parentId = new ObjectId().toHexString();
	const storageLocationId = new ObjectId().toHexString();

	const fileRecord = fileRecordTestFactory().build({
		parentId,
		storageLocationId,
		name: 'test.jpg',
		mimeType: 'image/jpeg',
	});

	return { fileRecord };
};

describe('FilesStorageService preview failed methods', () => {
	let module: TestingModule;
	let service: FilesStorageService;
	let fileRecordRepo: DeepMocked<FileRecordRepo>;
	let logger: DeepMocked<Logger>;

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
					provide: FILE_STORAGE_CONFIG_TOKEN,
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
		logger = module.get(Logger);
	});

	afterAll(async () => {
		await module.close();
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('previewNotPossible', () => {
		describe('when called with a file record', () => {
			it('should mark the file record as preview generation failed and save it', async () => {
				const { fileRecord } = buildFileRecord();

				// Initially preview should be possible for image/jpeg
				expect(fileRecord.previewGenerationFailed()).toBe(false);

				await service.markPreviewGenerationFailed(fileRecord);

				expect(fileRecord.previewGenerationFailed()).toBe(true);
				expect(fileRecordRepo.save).toHaveBeenCalledWith([fileRecord]);
				expect(logger.warning).toHaveBeenCalled();
			});

			it('should log a warning message', async () => {
				const { fileRecord } = buildFileRecord();

				await service.markPreviewGenerationFailed(fileRecord);

				expect(logger.warning).toHaveBeenCalledWith(
					expect.objectContaining({
						message: 'Preview generation marked as failed',
					})
				);
			});
		});
	});
});
