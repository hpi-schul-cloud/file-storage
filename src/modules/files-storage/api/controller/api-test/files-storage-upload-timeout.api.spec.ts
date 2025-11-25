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
import FileTypeHelper from '../../../domain/service/file-type.helper';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';

jest.mock('../../../domain/service/file-type.helper');

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
				CORE_INCOMING_REQUEST_TIMEOUT_MS: 12,
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

			jest.spyOn(FileTypeHelper, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));

			return { validId, loggedInClient, user: studentUser };
		};

		describe('WHEN upload request exceeds client timeout', () => {
			it('should handle client timeout for large file upload', async () => {
				const { loggedInClient, validId } = setup();

				// Create a large buffer that will take time to upload
				const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'A'); // 10MB

				try {
					const response = await loggedInClient
						.post(`/upload/school/${validId}/schools/${validId}`)
						.attach('file', largeBuffer, 'large-file.txt')
						.set('connection', 'keep-alive')
						.set('content-type', 'multipart/form-data')
						.timeout(10);

					// Should not reach here due to timeout
					expect(response.status).toEqual(HttpStatus.REQUEST_TIMEOUT);
				} catch (error: unknown) {
					const timeoutError = error as { timeout?: number; code?: string };
					expect(timeoutError.timeout).toBeTruthy();
					expect(timeoutError.code).toEqual('ECONNABORTED');
				}
			});
		});

		/*describe('WHEN upload request exceeds client timeout', () => {
			it('should handle client timeout for large file upload', async () => {
				const { loggedInClient, validId } = setup();

				// Create a large buffer that will take time to upload
				const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'A'); // 10MB

				try {
					const response = await loggedInClient
						.post(`/upload/school/${validId}/schools/${validId}`)
						.attach('file', largeBuffer, 'large-file.txt')
						.set('connection', 'keep-alive')
						.set('content-type', 'multipart/form-data')
						.timeout(0);

					// Should not reach here due to timeout
					expect(response.status).toEqual(HttpStatus.REQUEST_TIMEOUT);
				} catch (error: unknown) {
					console.log('#######', error);
					const timeoutError = error as { timeout?: number; code?: string };
					//	expect(timeoutError.timeout).toBeTruthy();
					//	expect(timeoutError.code).toEqual('ECONNABORTED');
				}
			});
		});*/

		describe('WHEN upload request exceeds server timeout', () => {
			it('should handle server timeout for large file upload', async () => {
				const { loggedInClient, validId } = setup();

				// Create a large buffer that will take time to upload
				const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'A'); // 10MB

				const response = await loggedInClient
					.post(`/upload/school/${validId}/schools/${validId}`)
					.attach('file', largeBuffer, 'large-file.txt')
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data');

				expect(response.status).toEqual(HttpStatus.REQUEST_TIMEOUT);
			});
		});

		describe('WHEN upload completes within timeout', () => {
			it('should successfully upload small file quickly', async () => {
				const { loggedInClient, validId } = setup();
				const smallBuffer = Buffer.from('Quick upload test', 'utf8');

				const response = await loggedInClient
					.post(`/upload/school/${validId}/schools/${validId}`)
					.attach('file', smallBuffer, 'quick-file.txt')
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data')
					.timeout(5000); // Generous timeout

				expect(response.status).toEqual(201);
				expect(response.body.name).toEqual('quick-file.txt');
			});

			it('should handle normal-sized file upload with adequate timeout', async () => {
				const { loggedInClient, validId } = setup();
				const normalBuffer = Buffer.alloc(512 * 1024, 'C'); // 512KB

				const response = await loggedInClient
					.post(`/upload/school/${validId}/schools/${validId}`)
					.attach('file', normalBuffer, 'normal-file.txt')
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data')
					.timeout(10000); // 10 second timeout

				expect(response.status).toEqual(201);
				expect(response.body.name).toEqual('normal-file.txt');
			});
		});

		describe('WHEN testing upload behavior under different conditions', () => {
			it('should measure upload duration and verify timeout behavior', async () => {
				const { loggedInClient, validId } = setup();
				const testBuffer = Buffer.alloc(1024 * 1024, 'D'); // 1MB
				const timeoutMs = 2000;

				const startTime = Date.now();

				try {
					await loggedInClient
						.post(`/upload/school/${validId}/schools/${validId}`)
						.attach('file', testBuffer, 'timed-file.txt')
						.set('connection', 'keep-alive')
						.set('content-type', 'multipart/form-data')
						.timeout(timeoutMs);

					const duration = Date.now() - startTime;

					// If we reach here, upload was successful and should be within timeout
					expect(duration).toBeLessThan(timeoutMs);
				} catch (error: unknown) {
					const duration = Date.now() - startTime;
					const timeoutError = error as { timeout?: number };

					// If timeout occurred, duration should be close to timeout value
					if (timeoutError.timeout) {
						expect(duration).toBeGreaterThanOrEqual(timeoutMs * 0.9);
						expect(duration).toBeLessThan(timeoutMs * 1.5);
					}
				}
			});
		});
	});
});
