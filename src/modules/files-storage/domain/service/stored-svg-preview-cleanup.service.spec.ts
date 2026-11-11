import { createMock, type DeepMocked } from '@golevelup/ts-jest';
import { Logger } from '@infra/logger';
import { type GetFile, type S3ClientAdapter } from '@infra/s3-client';
import { EntityManager } from '@mikro-orm/mongodb';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { FILE_STORAGE_CONFIG_TOKEN, FILES_STORAGE_S3_CONNECTION } from '../../files-storage.config';
import { fileRecordTestFactory } from '../../testing';
import { FILE_RECORD_REPO, type FileRecordRepo } from '../contract';
import { FilePathFactory } from '../factory';
import { type FileRecord } from '../file-record.do';
import { StoredSvgPreviewCleanupLoggable } from '../loggable';
import { FilesStorageService } from './files-storage.service';
import { PreviewService } from './preview.service';
import {
	STORED_SVG_PREVIEW_CLEANUP_COLLECTION,
	STORED_SVG_PREVIEW_CLEANUP_TASK_ID,
	StoredSvgPreviewCleanupService,
} from './stored-svg-preview-cleanup.service';

const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
	'base64'
);

describe('StoredSvgPreviewCleanupService', () => {
	let module: TestingModule;
	let service: StoredSvgPreviewCleanupService;
	let fileRecordRepo: DeepMocked<FileRecordRepo>;
	let storageClient: DeepMocked<S3ClientAdapter>;
	let filesStorageService: DeepMocked<FilesStorageService>;
	let previewService: DeepMocked<PreviewService>;
	let logger: DeepMocked<Logger>;
	let config: { cleanupStoredSvgXmlPreviews: boolean };
	let entityManager: { getCollection: jest.Mock };
	let collection: {
		insertOne: jest.Mock;
		findOneAndUpdate: jest.Mock;
		updateOne: jest.Mock;
		deleteOne: jest.Mock;
	};

	const fileWithBytes = (bytes: Buffer): GetFile => ({ data: Readable.from([bytes]) });

	const buildImage = (name = 'poc.png'): FileRecord => fileRecordTestFactory().build({ name, mimeType: 'image/png' });

	beforeAll(async () => {
		config = { cleanupStoredSvgXmlPreviews: true };
		collection = {
			insertOne: jest.fn(),
			findOneAndUpdate: jest.fn(),
			updateOne: jest.fn(),
			deleteOne: jest.fn(),
		};

		entityManager = { getCollection: jest.fn(() => collection) };
		module = await Test.createTestingModule({
			providers: [
				StoredSvgPreviewCleanupService,
				{ provide: FILES_STORAGE_S3_CONNECTION, useValue: createMock<S3ClientAdapter>() },
				{ provide: FILE_RECORD_REPO, useValue: createMock<FileRecordRepo>() },
				{ provide: FilesStorageService, useValue: createMock<FilesStorageService>() },
				{ provide: PreviewService, useValue: createMock<PreviewService>() },
				{ provide: Logger, useValue: createMock<Logger>() },
				{ provide: EntityManager, useValue: entityManager },
				{ provide: FILE_STORAGE_CONFIG_TOKEN, useValue: config },
			],
		}).compile();

		service = module.get(StoredSvgPreviewCleanupService);
		storageClient = module.get(FILES_STORAGE_S3_CONNECTION);
		fileRecordRepo = module.get(FILE_RECORD_REPO);
		filesStorageService = module.get(FilesStorageService);
		previewService = module.get(PreviewService);
		logger = module.get(Logger);
	});

	beforeEach(() => {
		jest.resetAllMocks();
		config.cleanupStoredSvgXmlPreviews = true;
		entityManager.getCollection.mockReturnValue(collection);
		collection.updateOne.mockResolvedValue({ matchedCount: 1 });
		collection.deleteOne.mockResolvedValue({ deletedCount: 1 });
		fileRecordRepo.findStoredSvgPreviewCandidates.mockResolvedValue([]);
	});

	afterAll(async () => {
		await module.close();
	});

	describe('removeStoredSvgAndXmlPreviews', () => {
		it('removes svg bytes stored as a raster image and keeps a real png', async () => {
			const disguised = buildImage('poc.png');
			const realPng = buildImage('photo.png');
			fileRecordRepo.findStoredSvgPreviewCandidates
				.mockResolvedValueOnce([disguised, realPng])
				.mockResolvedValueOnce([]);
			storageClient.get.mockImplementation((path: string): Promise<GetFile> => {
				return Promise.resolve(fileWithBytes(path === FilePathFactory.create(disguised) ? svg : png));
			});
			const deleted: string[] = [];
			previewService.deletePreviews.mockImplementation((): Promise<void> => {
				deleted.push('previews');

				return Promise.resolve();
			});
			filesStorageService.deleteFiles.mockImplementation((): Promise<void> => {
				deleted.push('files');

				return Promise.resolve();
			});

			const result = await service.removeStoredSvgAndXmlPreviews();

			expect(storageClient.get).toHaveBeenCalledWith(FilePathFactory.create(disguised), 'bytes=0-8191');
			expect(previewService.deletePreviews).toHaveBeenCalledWith([disguised]);
			expect(filesStorageService.deleteFiles).toHaveBeenCalledWith([disguised]);
			expect(deleted).toEqual(['previews', 'files']);
			expect(result).toEqual({ scanned: 2, removed: 1, missingBinaries: 0 });
		});

		it('counts a missing binary and still removes the next svg file', async () => {
			const missing = buildImage('missing.png');
			const disguised = buildImage('poc.svg.png');
			fileRecordRepo.findStoredSvgPreviewCandidates
				.mockResolvedValueOnce([missing, disguised])
				.mockResolvedValueOnce([]);
			storageClient.get.mockImplementation((path: string): Promise<GetFile> => {
				if (path === FilePathFactory.create(missing)) {
					return Promise.reject(new NotFoundException('NoSuchKey'));
				}

				return Promise.resolve(fileWithBytes(svg));
			});

			const result = await service.removeStoredSvgAndXmlPreviews();

			expect(filesStorageService.deleteFiles).toHaveBeenCalledWith([disguised]);
			expect(result).toEqual({ scanned: 1, removed: 1, missingBinaries: 1 });
		});

		it('reads the whole object when the byte range is rejected', async () => {
			const disguised = buildImage();
			const cause = new Error('InvalidRange');
			cause.name = 'InvalidRange';
			fileRecordRepo.findStoredSvgPreviewCandidates.mockResolvedValueOnce([disguised]).mockResolvedValueOnce([]);
			storageClient.get
				.mockRejectedValueOnce(new InternalServerErrorException('S3ClientAdapter:get', { cause }))
				.mockResolvedValueOnce(
					fileWithBytes(Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'))
				);

			await service.removeStoredSvgAndXmlPreviews();

			expect(storageClient.get).toHaveBeenNthCalledWith(1, FilePathFactory.create(disguised), 'bytes=0-8191');
			expect(storageClient.get).toHaveBeenNthCalledWith(2, FilePathFactory.create(disguised));
			expect(filesStorageService.deleteFiles).toHaveBeenCalledWith([disguised]);
		});

		it('leaves raster signatures in place when svg markup follows them', async () => {
			const polyglot = buildImage('polyglot.png');
			fileRecordRepo.findStoredSvgPreviewCandidates.mockResolvedValueOnce([polyglot]).mockResolvedValueOnce([]);
			storageClient.get.mockResolvedValue(fileWithBytes(Buffer.concat([png, svg])));

			const result = await service.removeStoredSvgAndXmlPreviews();

			expect(filesStorageService.deleteFiles).not.toHaveBeenCalled();
			expect(result.removed).toBe(0);
		});

		it('continues after the last id of a full page', async () => {
			const first = buildImage('first.png');
			const second = buildImage('second.png');
			fileRecordRepo.findStoredSvgPreviewCandidates.mockImplementation((afterId?: string): Promise<FileRecord[]> => {
				if (!afterId) {
					return Promise.resolve([first]);
				}
				if (afterId === first.id) {
					return Promise.resolve([second]);
				}

				return Promise.resolve([]);
			});
			storageClient.get.mockImplementation((): Promise<GetFile> => Promise.resolve(fileWithBytes(svg)));

			const result = await service.removeStoredSvgAndXmlPreviews();

			expect(fileRecordRepo.findStoredSvgPreviewCandidates).toHaveBeenNthCalledWith(2, first.id, 50);
			expect(filesStorageService.deleteFiles).toHaveBeenCalledTimes(2);
			expect(result.removed).toBe(2);
		});

		it('propagates storage errors that are not a missing file or an invalid range', async () => {
			const disguised = buildImage();
			fileRecordRepo.findStoredSvgPreviewCandidates.mockResolvedValue([disguised]);
			storageClient.get.mockRejectedValue(new InternalServerErrorException('S3ClientAdapter:get'));

			await expect(service.removeStoredSvgAndXmlPreviews()).rejects.toBeInstanceOf(InternalServerErrorException);
			expect(filesStorageService.deleteFiles).not.toHaveBeenCalled();
		});
	});

	describe('runOnce', () => {
		it('scans once and marks the task completed', async () => {
			collection.insertOne.mockResolvedValue({ acknowledged: true });

			await service.runOnce();

			expect(collection.insertOne).toHaveBeenCalledWith({
				_id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID,
				status: 'running',
				startedAt: expect.any(Date),
			});
			expect(entityManager.getCollection).toHaveBeenCalledWith(STORED_SVG_PREVIEW_CLEANUP_COLLECTION);
			expect(fileRecordRepo.findStoredSvgPreviewCandidates).toHaveBeenCalledWith(undefined, 50);
			expect(collection.updateOne).toHaveBeenCalledWith(
				{
					_id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID,
					status: 'running',
					startedAt: expect.any(Date),
				},
				{
					$set: expect.objectContaining({
						status: 'completed',
						scanned: 0,
						removed: 0,
						missingBinaries: 0,
					}),
				}
			);
			expect(logger.info).toHaveBeenCalledWith(expect.any(StoredSvgPreviewCleanupLoggable));
		});

		it('does not scan when another run is already recorded', async () => {
			collection.insertOne.mockRejectedValue({ code: 11000 });
			collection.findOneAndUpdate.mockResolvedValue(null);

			await service.runOnce();

			expect(fileRecordRepo.findStoredSvgPreviewCandidates).not.toHaveBeenCalled();
			expect(logger.info).toHaveBeenCalledWith(expect.any(StoredSvgPreviewCleanupLoggable));
		});

		it('takes over a stale run', async () => {
			collection.insertOne.mockRejectedValue({ codeName: 'DuplicateKey' });
			collection.findOneAndUpdate.mockResolvedValue({ _id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID });

			await service.runOnce();

			expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
				{
					_id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID,
					status: 'running',
					startedAt: { $lt: expect.any(Date) },
				},
				{ $set: { startedAt: expect.any(Date) } },
				{ returnDocument: 'after' }
			);
			expect(fileRecordRepo.findStoredSvgPreviewCandidates).toHaveBeenCalled();
		});

		it('releases the task when the scan fails', async () => {
			collection.insertOne.mockResolvedValue({ acknowledged: true });
			fileRecordRepo.findStoredSvgPreviewCandidates.mockRejectedValue(new Error('database unavailable'));

			await service.runOnce();

			expect(collection.deleteOne).toHaveBeenCalledWith({
				_id: STORED_SVG_PREVIEW_CLEANUP_TASK_ID,
				status: 'running',
				startedAt: expect.any(Date),
			});
			expect(logger.warning).toHaveBeenCalledWith(expect.any(StoredSvgPreviewCleanupLoggable));
		});
	});

	describe('onApplicationBootstrap', () => {
		const originalNodeEnv = process.env.NODE_ENV;

		afterEach(() => {
			process.env.NODE_ENV = originalNodeEnv;
			jest.restoreAllMocks();
		});

		it('does not start while the process is not production', () => {
			const runOnce = jest.spyOn(service, 'runOnce').mockResolvedValue();

			service.onApplicationBootstrap();

			expect(runOnce).not.toHaveBeenCalled();
		});

		it('starts one cleanup when the production flag is enabled', () => {
			process.env.NODE_ENV = 'production';
			const runOnce = jest.spyOn(service, 'runOnce').mockResolvedValue();

			service.onApplicationBootstrap();

			expect(runOnce).toHaveBeenCalledTimes(1);
		});

		it('stays idle in production when the flag is disabled', () => {
			process.env.NODE_ENV = 'production';
			config.cleanupStoredSvgXmlPreviews = false;
			const runOnce = jest.spyOn(service, 'runOnce').mockResolvedValue();

			service.onApplicationBootstrap();

			expect(runOnce).not.toHaveBeenCalled();
		});
	});
});
