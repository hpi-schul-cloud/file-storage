import { createMock } from '@golevelup/ts-jest';
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
					useValue: createMock<WopiConfig>({
						FEATURE_COLUMN_BOARD_COLLABORA_ENABLED: false,
						COLLABORA_MAX_FILE_SIZE_IN_BYTES: 104857600,
					}),
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
		wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = false;
	});

	describe('checkCollaboraCompatibilityMimetype', () => {
		describe('when mimetype is not collabora compatible', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().asApplicationOctetStream().build();

				return { fileRecord };
			};

			it('should throw NotFoundException if mimetype is not collabora compatible', () => {
				const { fileRecord } = setup();

				expect(() => wopiService.checkCollaboraCompatibilityMimetype(fileRecord)).toThrow(
					'File mimetype not collabora compatible.'
				);
			});
		});

		describe('when mimetype is collabora compatible', () => {
			const setup = () => {
				const fileRecord = fileRecordTestFactory().asOpenDocument().build();

				return { fileRecord };
			};

			it('should not throw if mimetype is collabora compatible', () => {
				const { fileRecord } = setup();

				expect(() => wopiService.checkCollaboraCompatibilityMimetype(fileRecord)).not.toThrow();
			});
		});
	});

	describe('ensureWopiEnabled', () => {
		it('should throw NotFoundException if WOPI feature is disabled', () => {
			wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = false;

			expect(() => wopiService.ensureWopiEnabled()).toThrow('WOPI feature is disabled.');
		});

		it('should not throw if WOPI feature is enabled', () => {
			wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

			const result = wopiService.ensureWopiEnabled();

			expect(result).toBe(undefined);
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

	describe('getTokenTtlInSeconds', () => {
		it('should return the token TTL in seconds from config', () => {
			const ttl = wopiService.getTokenTtlInSeconds();

			expect(ttl).toBe(wopiConfig.WOPI_TOKEN_TTL_IN_SECONDS);
		});
	});

	describe('getWopiUrl', () => {
		it('should return the WOPI URL from config', () => {
			const url = wopiService.getWopiUrl();

			expect(url).toBe(wopiConfig.WOPI_URL);
		});
	});

	describe('getPostMessageOrigin', () => {
		it('should return the WOPI post message origin from config', () => {
			const origin = wopiService.getPostMessageOrigin();

			expect(origin).toBe(wopiConfig.WOPI_POST_MESSAGE_ORIGIN);
		});
	});
});
