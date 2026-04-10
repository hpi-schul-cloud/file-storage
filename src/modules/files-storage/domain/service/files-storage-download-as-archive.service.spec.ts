import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { GetFile, S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import {
	FILE_STORAGE_CONFIG_TOKEN,
	FILES_STORAGE_S3_CONNECTION,
	FileStorageConfig,
} from '@modules/files-storage/files-storage.config';
import { fileRecordTestFactory } from '@modules/files-storage/testing';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Archiver } from 'archiver';
import { Readable } from 'stream';
import { ArchiveFactory } from '../factory';
import { FILE_RECORD_REPO, FileRecordRepo } from '../interface';
import { FileResponseFactory } from '../mapper';
import { FilesStorageService } from './files-storage.service';

const buildFileRecordsWithParams = () => {
	const parentId = new ObjectId().toHexString();
	const storageLocationId = new ObjectId().toHexString();

	const fileRecords = fileRecordTestFactory().buildList(3, { parentId, storageLocationId });

	return { fileRecords, parentId };
};

const archive = {
	destroy: jest.fn(),
	once: jest.fn(),
	off: jest.fn(),
};

describe('FilesStorageService.downloadFilesAsArchive', () => {
	let module: TestingModule;
	let service: FilesStorageService;
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
		logger = module.get(Logger);
	});

	beforeEach(() => {
		jest.resetAllMocks();
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await module.close();
	});

	describe('when fileRecords is empty', () => {
		it('should throw NotFoundException', () => {
			expect(() => {
				service.downloadFilesAsArchive([], 'archive.zip');
			}).toThrow(NotFoundException);
		});
	});
	describe('when fileRecords is not empty', () => {
		const setup = () => {
			const { fileRecords, parentId } = buildFileRecordsWithParams();
			const archiveName = 'test';
			const fileResponse = createMock<GetFile>({
				data: Readable.from('test data'),
			});

			const archive = createMock<Archiver>();
			jest.spyOn(ArchiveFactory, 'createEmpty').mockReturnValueOnce(archive);
			// @ts-ignore
			const populateSpy = jest.spyOn(service, 'populateArchiveAndFinalize').mockResolvedValue();

			const spyDownloadFile = jest.spyOn(service, 'downloadFile');
			const fileResponses = fileRecords.map((fileRecord) => {
				const response = FileResponseFactory.create(fileResponse, fileRecord.getName());
				spyDownloadFile.mockResolvedValueOnce(response);

				return response;
			});

			return { fileRecords, parentId, archiveName, fileResponses, spyDownloadFile, fileResponse, archive, populateSpy };
		};
		it('should create archive and return file response', () => {
			const { fileRecords, archiveName, fileResponses, archive, populateSpy } = setup();
			jest.spyOn(FileResponseFactory, 'createFromArchive').mockReturnValueOnce(fileResponses[0]);

			const result = service.downloadFilesAsArchive(fileRecords, archiveName);
			expect(ArchiveFactory.createEmpty).toHaveBeenCalledWith(fileRecords, logger);
			expect(populateSpy).toHaveBeenCalledWith(archive, fileRecords);
			expect(FileResponseFactory.createFromArchive).toHaveBeenCalledWith(archiveName, archive);
			expect(result).toBe(fileResponses[0]);
		});
	});

	describe('when archive emits entry event', () => {
		const setup = () => {
			const fileResponse = { name: 'test.txt', stream: {} };

			// Mock ArchiveFactory.appendFile
			jest.spyOn(ArchiveFactory, 'appendFile').mockImplementation(() => {});

			// Set up the archive.once mock to immediately call the onEntry handler
			archive.once.mockImplementation((event: string, handler: Function) => {
				if (event === 'entry') {
					// Simulate the entry event being emitted
					setTimeout(() => handler(), 0);
				}
			});

			return { fileResponse };
		};

		it('should resolve ', async () => {
			const { fileResponse } = setup();
			// @ts-ignore - Access private method
			const promise = service.appendAndWaitForEntry(archive, fileResponse);

			await expect(promise).resolves.toBeUndefined();
			expect(ArchiveFactory.appendFile).toHaveBeenCalledWith(archive, fileResponse);
			expect(archive.once).toHaveBeenCalledWith('entry', expect.any(Function));
			expect(archive.once).toHaveBeenCalledWith('error', expect.any(Function));
		});
	});

	describe('when archive emits error event', () => {
		const setup = () => {
			const fileResponse = { name: 'test.txt', stream: {} };
			const testError = new Error('Archive error');

			// Mock ArchiveFactory.appendFile
			jest.spyOn(ArchiveFactory, 'appendFile').mockImplementation(() => {});

			// Set up the archive.once mock to immediately call the onError handler
			archive.once.mockImplementation((event: string, handler: Function) => {
				if (event === 'error') {
					// Simulate the error event being emitted
					setTimeout(() => handler(testError), 0);
				}
			});

			return { fileResponse, testError };
		};

		it('should reject', async () => {
			const { fileResponse, testError } = setup();
			// @ts-ignore - Access private method
			const promise = service.appendAndWaitForEntry(archive, fileResponse);

			await expect(promise).rejects.toBe(testError);
			expect(ArchiveFactory.appendFile).toHaveBeenCalledWith(archive, fileResponse);
			expect(archive.once).toHaveBeenCalledWith('entry', expect.any(Function));
			expect(archive.once).toHaveBeenCalledWith('error', expect.any(Function));
		});
	});

	it('should properly clean up event listeners on entry', async () => {
		const fileResponse = { name: 'test.txt', stream: {} };

		let onEntryHandler: Function | undefined;
		let onErrorHandler: Function | undefined;

		// Mock ArchiveFactory.appendFile
		jest.spyOn(ArchiveFactory, 'appendFile').mockImplementation(() => {});

		// Capture the event handlers
		archive.once.mockImplementation((event: string, handler: Function) => {
			if (event === 'entry') {
				onEntryHandler = handler;
			} else if (event === 'error') {
				onErrorHandler = handler;
			}
		});

		// @ts-ignore - Access private method
		const promise = service.appendAndWaitForEntry(archive, fileResponse);

		// Simulate entry event
		setTimeout(() => onEntryHandler?.(), 0);

		await promise;

		// Verify that error listener was removed
		expect(archive.off).toHaveBeenCalledWith('error', onErrorHandler);
	});

	it('should properly clean up event listeners on error', async () => {
		const fileResponse = { name: 'test.txt', stream: {} };
		const testError = new Error('Archive error');

		let onEntryHandler: Function | undefined;
		let onErrorHandler: Function | undefined;

		// Mock ArchiveFactory.appendFile
		jest.spyOn(ArchiveFactory, 'appendFile').mockImplementation(() => {});

		// Capture the event handlers
		archive.once.mockImplementation((event: string, handler: Function) => {
			if (event === 'entry') {
				onEntryHandler = handler;
			} else if (event === 'error') {
				onErrorHandler = handler;
			}
		});

		// @ts-ignore - Access private method
		const promise = service.appendAndWaitForEntry(archive, fileResponse);

		// Simulate error event
		setTimeout(() => onErrorHandler?.(testError), 0);

		try {
			await promise;
		} catch (error) {
			// Expected error
		}

		// Verify that entry listener was removed
		expect(archive.off).toHaveBeenCalledWith('entry', onEntryHandler);
	});

	it('should handle onError callback correctly - remove entry listener and reject with original error', async () => {
		const fileResponse = { name: 'test.txt', stream: {} };
		const originalError = new Error('Specific archive error');
		originalError.stack = 'test stack trace';

		let capturedOnError: Function | undefined;
		let capturedOnEntry: Function | undefined;

		// Mock ArchiveFactory.appendFile
		jest.spyOn(ArchiveFactory, 'appendFile').mockImplementation(() => {});

		// Capture the error and entry handlers
		archive.once.mockImplementation((event: string, handler: Function) => {
			if (event === 'error') {
				capturedOnError = handler;
			} else if (event === 'entry') {
				capturedOnEntry = handler;
			}
		});

		// @ts-ignore - Access private method
		const promise = service.appendAndWaitForEntry(archive, fileResponse);

		// Directly call the onError handler to test lines 348-351
		capturedOnError?.(originalError);

		// Verify the promise rejects with the exact original error
		await expect(promise).rejects.toBe(originalError);

		// Verify that archive.off was called to remove the entry listener
		expect(archive.off).toHaveBeenCalledWith('entry', capturedOnEntry);
		expect(archive.off).toHaveBeenCalledTimes(1);
	});

	it('should handle different error types in onError callback', async () => {
		const fileResponse = { name: 'test.txt', stream: {} };

		// Test with different error types
		const errorTypes = [
			new Error('Standard Error'),
			new TypeError('Type Error'),
			new RangeError('Range Error'),
			{ message: 'Custom error object' } as Error,
		];

		for (const testError of errorTypes) {
			let capturedOnError: Function | undefined;
			let capturedOnEntry: Function | undefined;

			// Reset mocks
			archive.once.mockClear();
			archive.off.mockClear();

			// Mock ArchiveFactory.appendFile
			jest.spyOn(ArchiveFactory, 'appendFile').mockImplementation(() => {});

			// Capture handlers
			archive.once.mockImplementation((event: string, handler: Function) => {
				if (event === 'error') {
					capturedOnError = handler;
				} else if (event === 'entry') {
					capturedOnEntry = handler;
				}
			});

			// @ts-ignore - Access private method
			const promise = service.appendAndWaitForEntry(archive, fileResponse);

			// Call the onError handler with the specific error type
			capturedOnError?.(testError);

			// Verify behavior for each error type
			await expect(promise).rejects.toBe(testError);
			expect(archive.off).toHaveBeenCalledWith('entry', capturedOnEntry);
		}
	});
});
