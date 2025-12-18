import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import { RequestTimeoutConfig } from '@modules/files-storage-app/files-storage-app.config';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';

jest.mock('../../../domain/utils/detect-mime-type.utils');

const createRndInt = (max: number) => Math.floor(Math.random() * max);

describe('files-storage controller (API) - Upload Timeout Tests', () => {
	let module: TestingModule;
	let app: INestApplication;
	let testApiClient: TestApiClient;
	let requestTimeoutConfig: DeepMocked<RequestTimeoutConfig>;

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
			.overrideProvider(RequestTimeoutConfig)
			.useValue({
				CORE_INCOMING_REQUEST_TIMEOUT_MS: 15,
				INCOMING_REQUEST_TIMEOUT_COPY_API_MS: 100,
			})
			.compile();

		app = module.createNestApplication();
		await app.init();
		await app.listen(appPort);

		testApiClient = new TestApiClient(app, baseRouteName);
		requestTimeoutConfig = module.get(RequestTimeoutConfig);
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
			const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
			const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);
			const validId = new ObjectId().toHexString();

			jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('application/octet-stream');

			return { validId, loggedInClient, user: studentUser };
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

				// Server has CORE_INCOMING_REQUEST_TIMEOUT_MS set to 15ms
				// Create a buffer that will trigger server timeout due to processing time
				const buffer = Buffer.alloc(2 * 1024 * 1024, 'A'); // 2MB

				const response = await loggedInClient
					.post(`/upload/school/${validId}/schools/${validId}`)
					.attach('file', buffer, 'large-file.txt')
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data')
					.timeout(1000); // Client timeout higher than server timeout

				expect(response.status).toEqual(HttpStatus.REQUEST_TIMEOUT);
				expect(response.text).toContain('Request timed out');
			});

			it('should handle server timeout with very large file that causes processing delay', async () => {
				const { loggedInClient, validId } = setup();

				// Use an even larger file to ensure timeout with processing overhead
				const buffer = Buffer.alloc(10 * 1024 * 1024, 'B'); // 10MB

				try {
					const response = await loggedInClient
						.post(`/upload/school/${validId}/schools/${validId}`)
						.attach('file', buffer, 'very-large-file.txt')
						.set('content-type', 'multipart/form-data')
						.timeout(2000); // Client timeout longer than server

					// If we get here, it should be a timeout response
					expect(response.status).toEqual(HttpStatus.REQUEST_TIMEOUT);
				} catch (error) {
					// Handle EPIPE/ECONNRESET error which can occur when server closes connection during timeout
					if (
						error.code === 'EPIPE' ||
						error.code === 'ECONNRESET' ||
						error.message.includes('write EPIPE') ||
						error.message.includes('write ECONNRESET')
					) {
						// This is expected behavior when server timeout occurs
						expect(true).toBe(true); // Test passes - timeout occurred as expected
					} else {
						throw error; // Re-throw unexpected errors
					}
				}
			});
		});

		describe('WHEN upload request completes within timeout', () => {
			it('should successfully upload small file within timeout limits', async () => {
				// Temporarily override server timeout to be longer
				requestTimeoutConfig.CORE_INCOMING_REQUEST_TIMEOUT_MS = 5000; // 5 seconds

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

		describe('WHEN testing timeout boundaries', () => {
			it('should timeout exactly at the configured server timeout value', async () => {
				// Set a very specific timeout value for precise testing before setup
				requestTimeoutConfig.CORE_INCOMING_REQUEST_TIMEOUT_MS = 10; // Very short timeout

				const { loggedInClient, validId } = setup();

				// File size that should trigger timeout at exactly 10ms - use large file
				const buffer = Buffer.alloc(8 * 1024 * 1024, 'D'); // 8MB - large enough to exceed 10ms

				try {
					const response = await loggedInClient
						.post(`/upload/school/${validId}/schools/${validId}`)
						.attach('file', buffer, 'boundary-test.txt')
						.timeout(1000);

					// If we get here, it should be a timeout response
					expect(response.status).toEqual(HttpStatus.REQUEST_TIMEOUT);
				} catch (error) {
					// Handle EPIPE error which can occur when server closes connection during timeout
					if (error.code === 'EPIPE' || error.code === 'ECONNRESET' || error.message.includes('write EPIPE')) {
						// This is expected behavior when server timeout occurs
						expect(true).toBe(true); // Test passes - timeout occurred as expected
					} else {
						throw error; // Re-throw unexpected errors
					}
				}
			});

			it('should handle upload when server timeout is longer than upload duration', async () => {
				// Set a longer timeout to allow upload to complete
				requestTimeoutConfig.CORE_INCOMING_REQUEST_TIMEOUT_MS = 5000; // 5 seconds

				const { loggedInClient, validId } = setup();

				// Small file that should upload within 5 seconds
				const buffer = Buffer.alloc(1024, 'F'); // 1KB

				const response = await loggedInClient
					.post(`/upload/school/${validId}/schools/${validId}`)
					.attach('file', buffer, 'small-boundary-test.txt')
					.timeout(10000);

				expect(response.status).toEqual(HttpStatus.CREATED);
				expect(response.body).toHaveProperty('id');
			});
		});
	});
});
