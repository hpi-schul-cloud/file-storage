import { ScanStatus } from '@modules/files-storage/domain';
import { fileRecordTestFactory } from '@modules/files-storage/testing';
import { Test, TestingModule } from '@nestjs/testing';
import { WopiConfig } from '../wopi.config';
import { WopiService } from './wopi.service';

describe('WopiService', () => {
	let module: TestingModule;
	let wopiService: WopiService;
	let wopiConfig: WopiConfig;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			providers: [
				WopiService,
				{
					provide: WopiConfig,
					useValue: {
						COLLABORA_MAX_FILE_SIZE_IN_BYTES: 104857600,
					},
				},
			],
		}).compile();

		wopiService = module.get(WopiService);
		wopiConfig = module.get(WopiConfig);
	});

	afterAll(async () => {
		await module.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
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
