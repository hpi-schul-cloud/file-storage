import { createMock } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import {
	FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN,
	RequestTimeoutConfig,
} from '@modules/files-storage-app/files-storage-app.config';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';

jest.mock('../../../domain/utils/detect-mime-type.utils');

const createRndInt = (max: number) => Math.floor(Math.random() * max);

describe('files-storage controller (API) - Upload Timeout Tests', () => {
	let module: TestingModule;
	let app: INestApplication;
	let requestTimeoutConfig: RequestTimeoutConfig;

	const baseRouteName = '/file';

	beforeEach(async () => {
		const appPort = 10000 + createRndInt(10000);

		module = await Test.createTestingModule({
			imports: [FilesStorageTestModule],
		})
			.overrideProvider(AntivirusService)
			.useValue(createMock<AntivirusService>())
			.overrideProvider(FILES_STORAGE_S3_CONNECTION)
			.useValue(createMock<S3ClientAdapter>())
			.overrideProvider(NodeClam)
			.useValue(createMock<NodeClam>())
			.overrideProvider(AuthorizationClientAdapter)
			.useValue(createMock<AuthorizationClientAdapter>())
			.overrideProvider(FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN)
			.useValue({
				coreIncomingRequestTimeoutMs: 15,
				incomingRequestTimeoutCopyApiMs: 100,
			})
			.compile();

		app = module.createNestApplication();
		await app.init();
		await app.listen(appPort);

		requestTimeoutConfig = module.get(FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN);
	});

	afterAll(async () => {
		await app.close();
		await module.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
		jest.restoreAllMocks();
	});

	describe('upload timeout scenarios', () => {
		const setup = () => {
			const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);
			const validId = new ObjectId().toHexString();

			jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('application/octet-stream');

			return { validId, loggedInClient };
		};

		describe('WHEN upload request exceeds client timeout', () => {
			it('should handle client timeout and throw ECONNABORTED error', async () => {
				const { loggedInClient, validId } = setup();

				// Create a buffer that will take time to upload
				const buffer = Buffer.alloc(5 * 1024 * 1024, 'A'); // 5MB

				await expect(
					loggedInClient
						.post(`/upload/school/${validId}/schools/${validId}`)
						.attach('file', buffer, 'large-file.txt')
						.set('connection', 'keep-alive')
						.set('content-type', 'multipart/form-data')
						.timeout(5) // Very short client timeout
				).rejects.toMatchObject({
					timeout: 5,
					code: 'ECONNABORTED',
				});
			});

			it('should handle client timeout with very small timeout value', async () => {
				const { loggedInClient, validId } = setup();

				// Small buffer but extremely short timeout to ensure timeout occurs
				const buffer = Buffer.alloc(1024, 'A'); // 1KB

				await expect(
					loggedInClient
						.post(`/upload/school/${validId}/schools/${validId}`)
						.attach('file', buffer, 'test-file.txt')
						.timeout(1) // 1ms - guaranteed timeout
				).rejects.toMatchObject({
					timeout: 1,
					code: 'ECONNABORTED',
				});
			});
		});

		describe('WHEN upload request exceeds server timeout', () => {
			it('should handle server timeout and return REQUEST_TIMEOUT status', async () => {
				const { loggedInClient, validId } = setup();

				// Make mime detection delay longer than the server timeout (15ms) to reliably trigger it
				jest
					.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream')
					.mockImplementation(
						() => new Promise((resolve) => setTimeout(() => resolve('application/octet-stream'), 100))
					);

				const buffer = Buffer.alloc(1024, 'A');

				const response = await loggedInClient
					.post(`/upload/school/${validId}/schools/${validId}`)
					.attach('file', buffer, 'test-file.txt')
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data')
					.timeout(1000);

				expect(response.status).toEqual(HttpStatus.REQUEST_TIMEOUT);
				expect(response.text).toContain('Request timed out');
			});
		});

		describe('WHEN upload request completes within timeout', () => {
			it('should successfully upload small file within timeout limits', async () => {
				// Temporarily override server timeout to be longer
				requestTimeoutConfig.coreIncomingRequestTimeoutMs = 5000; // 5 seconds

				const { loggedInClient, validId } = setup();

				// Small file that should upload quickly
				const buffer = Buffer.alloc(100, 'C'); // 100 bytes

				const response = await loggedInClient
					.post(`/upload/school/${validId}/schools/${validId}`)
					.attach('file', buffer, 'small-file.txt')
					.set('content-type', 'multipart/form-data')
					.timeout(10000); // Long client timeout

				expect(response.status).toEqual(HttpStatus.CREATED);
				expect(response.body).toHaveProperty('id');
				expect(response.body.name).toEqual('small-file.txt');
			});
		});
	});
});
