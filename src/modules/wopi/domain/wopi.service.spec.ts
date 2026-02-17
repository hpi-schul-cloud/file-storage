import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { FilesStorageService, ScanStatus } from '@modules/files-storage';
import { fileRecordTestFactory, GetFileResponseTestFactory } from '@modules/files-storage/testing';
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { WOPI_CONFIG_TOKEN, WopiConfig } from '../wopi.config';
import { WopiService } from './wopi.service';

describe('WopiService', () => {
	let module: TestingModule;
	let wopiService: WopiService;
	let wopiConfig: WopiConfig;
	let filesStorageService: DeepMocked<FilesStorageService>;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			providers: [
				WopiService,
				{ provide: FilesStorageService, useValue: createMock<FilesStorageService>() },
				{
					provide: WOPI_CONFIG_TOKEN,
					useValue: {
						COLLABORA_MAX_FILE_SIZE_IN_BYTES: 104857600,
					},
				},
			],
		}).compile();

		wopiService = module.get(WopiService);
		wopiConfig = module.get(WOPI_CONFIG_TOKEN);
		filesStorageService = module.get(FilesStorageService);
	});

	afterAll(async () => {
		await module.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('updateFileContents', () => {
		describe('when file exists and can be updated', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().asOpenDocument().build();
				filesStorageService.getFileRecord.mockResolvedValue(fileRecord);
				filesStorageService.updateFileContents.mockResolvedValue(fileRecord);

				const readable = Readable.from('abc');

				return { fileRecord, readable };
			};

			it('should update and return the file record', async () => {
				const { fileRecord, readable } = setup();

				const result = await wopiService.updateFileContents(fileRecord.id, readable);

				expect(result).toEqual(fileRecord);
			});
		});

		describe('when file not exists', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().asOpenDocument().build();
				filesStorageService.getFileRecord.mockRejectedValue(new Error());
				filesStorageService.updateFileContents.mockResolvedValue(fileRecord);

				const readable = Readable.from('abc');

				return { fileRecord, readable };
			};

			it('should throw if file not found', async () => {
				const { fileRecord, readable } = setup();

				await expect(wopiService.updateFileContents(fileRecord.id, readable)).rejects.toThrow(new Error());
			});
		});

		describe('when file can not be updated', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().asOpenDocument().build();
				filesStorageService.getFileRecord.mockResolvedValueOnce(fileRecord);
				filesStorageService.updateFileContents.mockRejectedValueOnce(new Error());

				const readable = Readable.from('abc');

				return { fileRecord, readable };
			};

			it('should throw if file can not be updated', async () => {
				const { fileRecord, readable } = setup();

				await expect(wopiService.updateFileContents(fileRecord.id, readable)).rejects.toThrow(new Error());
			});
		});
	});

	describe('getFile', () => {
		describe('when file exists and is collabora editable', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().asOpenDocument().build();
				const fileResponse = GetFileResponseTestFactory.build(fileRecord);
				filesStorageService.getFileRecord.mockResolvedValueOnce(fileRecord);
				filesStorageService.downloadFile.mockResolvedValueOnce(fileResponse);

				return { fileRecord, fileResponse };
			};

			it('should return the file response', async () => {
				const { fileRecord, fileResponse } = setup();

				const result = await wopiService.getFile(fileRecord.id);

				expect(result).toEqual(fileResponse);
			});
		});
	});

	describe('getFileRecord', () => {
		describe('when file exists and is collabora editable', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().asOpenDocument().build();
				filesStorageService.getFileRecord.mockResolvedValueOnce(fileRecord);

				return { fileRecord };
			};

			it('should return the file', async () => {
				const { fileRecord } = setup();

				const result = await wopiService.getFileRecord(fileRecord.id);

				expect(result).toEqual(fileRecord);
			});
		});

		describe('when file exists and is not collabora editable', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().asApplicationOctetStream().build();
				filesStorageService.getFileRecord.mockResolvedValueOnce(fileRecord);

				return { fileRecord };
			};

			it('should throw with NotFoundException', async () => {
				const { fileRecord } = setup();

				await expect(wopiService.getFileRecord(fileRecord.id)).rejects.toThrow(NotFoundException);
			});
		});
	});

	describe('throwIfNotCollaboraEditable', () => {
		describe('when file is not collabora editable', () => {
			it('should throw NotFoundException if file is not collabora editable type', () => {
				const fileRecord = fileRecordTestFactory().asApplicationOctetStream().build();

				expect(() => wopiService.throwIfNotCollaboraEditable(fileRecord)).toThrow(
					'File blocked due to suspected virus, mimetype not collabora compatible or file size exceeds limit.'
				);
			});

			it('should throw NotFoundException if file is not collabora editable due to size', () => {
				const fileRecord = fileRecordTestFactory()
					.asOpenDocument()
					.build({
						size: wopiConfig.COLLABORA_MAX_FILE_SIZE_IN_BYTES + 1,
					});

				expect(() => wopiService.throwIfNotCollaboraEditable(fileRecord)).toThrow(
					'File blocked due to suspected virus, mimetype not collabora compatible or file size exceeds limit.'
				);
			});

			it('should throw NotFoundException if file is not collabora editable due to security scan status', () => {
				const fileRecord = fileRecordTestFactory()
					.asOpenDocument()
					.withScanStatus(ScanStatus.BLOCKED)
					.build({
						size: wopiConfig.COLLABORA_MAX_FILE_SIZE_IN_BYTES - 1,
					});

				expect(() => wopiService.throwIfNotCollaboraEditable(fileRecord)).toThrow(
					'File blocked due to suspected virus, mimetype not collabora compatible or file size exceeds limit.'
				);
			});

			it('should not throw if file is collabora editable', () => {
				const fileRecord = fileRecordTestFactory()
					.asOpenDocument()
					.withScanStatus(ScanStatus.VERIFIED)
					.build({
						size: wopiConfig.COLLABORA_MAX_FILE_SIZE_IN_BYTES - 1,
					});
				expect(() => wopiService.throwIfNotCollaboraEditable(fileRecord)).not.toThrow();
			});
		});
	});
});
