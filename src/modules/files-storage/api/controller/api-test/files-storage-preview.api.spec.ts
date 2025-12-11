import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { ApiValidationError } from '@infra/error';
import { PreviewProducer } from '@infra/preview-generator';
import { RpcTimeoutException } from '@infra/rabbitmq';
import { S3ClientAdapter } from '@infra/s3-client';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { INestApplication, NotFoundException, StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityId } from '@shared/domain/types';
import { cleanupCollections } from '@testing/database';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import { PreviewOutputMimeTypes, PreviewWidth, ScanStatus } from '../../../domain';
import { ErrorType } from '../../../domain/error';
import DetectMimeTypeUtils from '../../../domain/service/detect-mime-type.utils';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';
import { FileRecordEntity } from '../../../repo';
import { GetFileTestFactory } from '../../../testing';
import { FileRecordResponse } from '../../dto';

const createRndInt = (max: number) => Math.floor(Math.random() * max);
jest.mock('../../../domain/service/detect-mime-type.utils');

const defaultQueryParameters = {
	width: PreviewWidth.WIDTH_500,
	outputFormat: PreviewOutputMimeTypes.IMAGE_WEBP,
};

const baseRouteName = '/file';

describe('File Controller (API) - preview', () => {
	let module: TestingModule;
	let app: INestApplication;
	let em: EntityManager;
	let s3ClientAdapter: DeepMocked<S3ClientAdapter>;
	let antivirusService: DeepMocked<AntivirusService>;
	let previewProducer: DeepMocked<PreviewProducer>;
	let testApiClient: TestApiClient;
	let uploadPath: string;

	beforeAll(async () => {
		const appPort = 10000 + createRndInt(10000);

		module = await Test.createTestingModule({
			imports: [FilesStorageTestModule],
		})
			.overrideProvider(AntivirusService)
			.useValue(createMock<AntivirusService>())
			.overrideProvider(PreviewProducer)
			.useValue(createMock<PreviewProducer>())
			.overrideProvider(FILES_STORAGE_S3_CONNECTION)
			.useValue(createMock<S3ClientAdapter>())
			.overrideProvider(NodeClam)
			.useValue(createMock<NodeClam>())
			.overrideProvider(AuthorizationClientAdapter)
			.useValue(createMock<AuthorizationClientAdapter>())
			.compile();

		app = module.createNestApplication();
		const a = await app.init();
		await a.listen(appPort);

		em = module.get(EntityManager);
		s3ClientAdapter = module.get(FILES_STORAGE_S3_CONNECTION);
		antivirusService = module.get(AntivirusService);
		previewProducer = module.get(PreviewProducer);
		testApiClient = new TestApiClient(app, baseRouteName);
	});

	afterAll(async () => {
		await app.close();
		await module.close();
	});

	beforeEach(async () => {
		jest.resetAllMocks();
		await cleanupCollections(em);
	});

	const setScanStatus = async (fileRecordId: EntityId, status: ScanStatus) => {
		const fileRecord = await em.findOneOrFail(FileRecordEntity, fileRecordId);
		fileRecord.securityCheck.status = status;
		await em.flush();
	};

	const setupApiClient = () => {
		const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();

		const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

		const validId = new ObjectId().toHexString();

		uploadPath = `/upload/school/${validId}/schools/${validId}`;

		jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('application/octet-stream');
		antivirusService.scanStream.mockResolvedValueOnce({ virus_detected: false });

		return loggedInClient;
	};

	const uploadFile = async (loggedInClient: TestApiClient) => {
		const uploadResponse = await loggedInClient
			.post(uploadPath)
			.attach('file', Buffer.from('abcd'), 'test.png')
			.set('connection', 'keep-alive')
			.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20')
			.query({});
		const uploadedFile = uploadResponse.body as FileRecordResponse;

		return uploadedFile;
	};

	describe('preview', () => {
		describe('with not authenticated user', () => {
			it('should return status 401', async () => {
				const response = await testApiClient.get('/preview/123/test.png').query(defaultQueryParameters);

				expect(response.status).toEqual(401);
			});
		});

		describe('with bad request data', () => {
			describe('WHEN recordId is invalid', () => {
				it('should return status 400', async () => {
					const loggedInClient = setupApiClient();
					const response = await loggedInClient.get('/preview/123/test.png').query(defaultQueryParameters);
					const result = response.body as ApiValidationError;

					expect(result.validationErrors).toEqual([
						{
							errors: ['fileRecordId must be a mongodb id'],
							field: ['fileRecordId'],
						},
					]);
					expect(response.status).toEqual(400);
				});
			});

			describe('WHEN width is other than PreviewWidth Enum', () => {
				it('should return status 400', async () => {
					const loggedInClient = setupApiClient();
					const uploadedFile = await uploadFile(loggedInClient);

					const query = {
						...defaultQueryParameters,
						width: 2000,
					};
					const response = await loggedInClient.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`).query(query);
					const result = response.body as ApiValidationError;

					expect(result.validationErrors).toEqual([
						{
							errors: ['width must be one of the following values: 50, 150, 500'],
							field: ['width'],
						},
					]);
					expect(response.status).toEqual(400);
				});
			});

			describe('WHEN output format is wrong', () => {
				it('should return status 400', async () => {
					const loggedInClient = setupApiClient();
					const uploadedFile = await uploadFile(loggedInClient);

					const query = { ...defaultQueryParameters, outputFormat: 'image/txt' };
					const response = await loggedInClient.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`).query(query);
					const result = response.body as ApiValidationError;

					expect(result.validationErrors).toEqual([
						{
							errors: ['outputFormat must be one of the following values: image/webp'],
							field: ['outputFormat'],
						},
					]);
					expect(response.status).toEqual(400);
				});
			});

			describe('WHEN file does not exist', () => {
				it('should return status 404', async () => {
					const loggedInClient = setupApiClient();
					const uploadedFile = await uploadFile(loggedInClient);

					const wrongId = new ObjectId().toString();
					const response = await loggedInClient
						.get(`/preview/${wrongId}/${uploadedFile.name}`)
						.query(defaultQueryParameters);
					const result = response.body as ApiValidationError;

					expect(result.message).toEqual('The requested params are not been found.');
					expect(response.status).toEqual(404);
				});
			});

			describe('WHEN filename is wrong', () => {
				it('should return status 404', async () => {
					const loggedInClient = setupApiClient();
					const uploadedFile = await uploadFile(loggedInClient);
					await setScanStatus(uploadedFile.id, ScanStatus.VERIFIED);

					const error = new NotFoundException();
					s3ClientAdapter.get.mockRejectedValueOnce(error);

					const response = await loggedInClient
						.get(`/preview/${uploadedFile.id}/wrong-name.txt`)
						.query(defaultQueryParameters);
					const result = response.body as ApiValidationError;

					expect(result.message).toEqual(ErrorType.FILE_NOT_FOUND);
					expect(response.status).toEqual(404);
				});
			});
		});

		describe(`with valid request data`, () => {
			describe('WHEN preview does already exist', () => {
				describe('WHEN forceUpdate is undefined', () => {
					const setup = async () => {
						const loggedInClient = setupApiClient();
						const uploadedFile = await uploadFile(loggedInClient);
						await setScanStatus(uploadedFile.id, ScanStatus.VERIFIED);

						const previewFile = GetFileTestFactory.build({ contentRange: 'bytes 0-3/4' });
						s3ClientAdapter.get.mockResolvedValueOnce(previewFile);

						return { loggedInClient, uploadedFile };
					};

					it('should return status 200 for successful download', async () => {
						const { loggedInClient, uploadedFile } = await setup();
						const buffer = Buffer.from('testText');

						const response = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.query(defaultQueryParameters);
						const result = response.body as StreamableFile;

						expect(response.status).toEqual(200);
						expect(result).toEqual(buffer);
					});

					it('should return status 206 and required headers for the successful partial file stream download', async () => {
						const { loggedInClient, uploadedFile } = await setup();

						const response = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.set('Range', 'bytes=0-')
							.query(defaultQueryParameters);
						const headers = response.headers as Record<string, string>;

						expect(response.status).toEqual(206);
						expect(headers['accept-ranges']).toMatch('bytes');
						expect(headers['content-range']).toMatch('bytes 0-3/4');
					});
				});

				describe('WHEN forceUpdate is false', () => {
					const setup = async () => {
						const loggedInClient = setupApiClient();
						const uploadedFile = await uploadFile(loggedInClient);
						await setScanStatus(uploadedFile.id, ScanStatus.VERIFIED);

						const previewFile = GetFileTestFactory.build({ contentRange: 'bytes 0-3/4' });
						s3ClientAdapter.get.mockResolvedValueOnce(previewFile);

						return { loggedInClient, uploadedFile };
					};

					describe('WHEN header contains no etag', () => {
						it('should return status 200 for successful download', async () => {
							const { loggedInClient, uploadedFile } = await setup();
							const query = {
								...defaultQueryParameters,
								forceUpdate: false,
							};

							const response = await loggedInClient
								.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
								.query(query);

							expect(response.status).toEqual(200);
						});

						it('should return status 206 and required headers for the successful partial file stream download', async () => {
							const { loggedInClient, uploadedFile } = await setup();
							const query = {
								...defaultQueryParameters,
								forceUpdate: false,
							};

							const response = await loggedInClient
								.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
								.set('Range', 'bytes=0-')
								.query(query);
							const headers = response.headers as Record<string, string>;

							expect(response.status).toEqual(206);
							expect(headers['accept-ranges']).toMatch('bytes');
							expect(headers['content-range']).toMatch('bytes 0-3/4');
							expect(headers.etag).toMatch('testTag');
						});
					});

					describe('WHEN header contains not matching etag', () => {
						it('should return status 200 for successful download', async () => {
							const { loggedInClient, uploadedFile } = await setup();
							const query = {
								...defaultQueryParameters,
								forceUpdate: false,
							};
							const etag = 'otherTag';

							const response = await loggedInClient
								.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
								.query(query)
								.set('If-None-Match', etag);

							expect(response.status).toEqual(200);
						});
					});

					describe('WHEN header contains matching etag', () => {
						it('should return status 304', async () => {
							const { loggedInClient, uploadedFile } = await setup();
							const query = {
								...defaultQueryParameters,
								forceUpdate: false,
							};
							const etag = 'testTag';

							const response = await loggedInClient
								.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
								.query(query)
								.set('If-None-Match', etag);

							expect(response.status).toEqual(304);
						});
					});
				});

				describe('WHEN forceUpdate is true', () => {
					const setup = async () => {
						const loggedInClient = setupApiClient();
						const uploadedFile = await uploadFile(loggedInClient);
						await setScanStatus(uploadedFile.id, ScanStatus.VERIFIED);

						const previewFile = GetFileTestFactory.build({ contentRange: 'bytes 0-3/4' });
						s3ClientAdapter.get.mockResolvedValueOnce(previewFile);

						return { loggedInClient, uploadedFile };
					};

					it('should return status 200 for successful download', async () => {
						const { loggedInClient, uploadedFile } = await setup();
						const query = {
							...defaultQueryParameters,
							forceUpdate: true,
						};

						const response = await loggedInClient.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`).query(query);

						expect(response.status).toEqual(200);
					});

					it('should return status 206 and required headers for the successful partial file stream download', async () => {
						const { loggedInClient, uploadedFile } = await setup();
						const query = {
							...defaultQueryParameters,
							forceUpdate: true,
						};

						const response = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.set('Range', 'bytes=0-')
							.query(query);
						const headers = response.headers as Record<string, string>;

						expect(response.status).toEqual(206);
						expect(headers['accept-ranges']).toMatch('bytes');
						expect(headers['content-range']).toMatch('bytes 0-3/4');
						expect(headers.etag).toMatch('testTag');
					});
				});

				describe('WHEN preview does not already exist', () => {
					const setup = async () => {
						const loggedInClient = setupApiClient();
						const uploadedFile = await uploadFile(loggedInClient);
						await setScanStatus(uploadedFile.id, ScanStatus.VERIFIED);

						const error = new NotFoundException();
						const previewFile = GetFileTestFactory.build({ contentRange: 'bytes 0-3/4' });
						s3ClientAdapter.get.mockRejectedValueOnce(error).mockResolvedValueOnce(previewFile);

						return { loggedInClient, uploadedFile };
					};

					it('should return status 200 for successful download', async () => {
						const { loggedInClient, uploadedFile } = await setup();

						const response = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.query(defaultQueryParameters);

						expect(response.status).toEqual(200);
					});

					it('should return status 206 and required headers for the successful partial file stream download', async () => {
						const { loggedInClient, uploadedFile } = await setup();

						const response = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.set('Range', 'bytes=0-')
							.query(defaultQueryParameters);
						const headers = response.headers as Record<string, string>;

						expect(response.status).toEqual(206);
						expect(headers['accept-ranges']).toMatch('bytes');
						expect(headers['content-range']).toMatch('bytes 0-3/4');
					});
				});

				describe('WHEN file has preview generation failed', () => {
					const setup = async () => {
						const loggedInClient = setupApiClient();
						const uploadedFile = await uploadFile(loggedInClient);
						await setScanStatus(uploadedFile.id, ScanStatus.VERIFIED);

						// Mark the file as having failed preview generation
						const fileRecord = await em.findOneOrFail(FileRecordEntity, uploadedFile.id);
						fileRecord.previewGenerationFailed = true;
						await em.flush();

						return { loggedInClient, uploadedFile };
					};

					it('should return status 404 with PREVIEW_NOT_POSSIBLE error immediately without attempting preview', async () => {
						const { loggedInClient, uploadedFile } = await setup();

						const response = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.query(defaultQueryParameters);

						expect(response.status).toEqual(404);
						expect(response.body.message).toEqual(ErrorType.PREVIEW_NOT_POSSIBLE);
						// Verify S3 client was never called since preview should fail immediately
						expect(s3ClientAdapter.get).not.toHaveBeenCalled();
					});

					it('should return same error for subsequent requests without retrying', async () => {
						const { loggedInClient, uploadedFile } = await setup();

						// First request
						const response1 = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.query(defaultQueryParameters);

						// Second request
						const response2 = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.query(defaultQueryParameters);

						expect(response1.status).toEqual(404);
						expect(response2.status).toEqual(404);
						expect(response1.body.message).toEqual(ErrorType.PREVIEW_NOT_POSSIBLE);
						expect(response2.body.message).toEqual(ErrorType.PREVIEW_NOT_POSSIBLE);
						// Verify S3 client was never called for either request
						expect(s3ClientAdapter.get).not.toHaveBeenCalled();
					});
				});
			});

			describe('WHEN preview generation fails', () => {
				describe('WHEN preview generation times out', () => {
					const setupTimeoutScenario = async () => {
						const loggedInClient = setupApiClient();
						const uploadedFile = await uploadFile(loggedInClient);
						await setScanStatus(uploadedFile.id, ScanStatus.VERIFIED);

						// Mock preview service to simulate timeout by making the request hang
						// The timeout interceptor should catch this and throw RequestTimeoutException
						previewProducer.generate.mockRejectedValueOnce(
							new RpcTimeoutException(new Error('Failed to receive response within timeout'))
						);
						s3ClientAdapter.get.mockRejectedValueOnce(new NotFoundException());

						return { loggedInClient, uploadedFile };
					};

					it('should mark file as preview generation failed and return 404 on subsequent requests', async () => {
						const { loggedInClient, uploadedFile } = await setupTimeoutScenario();

						// First request - should timeout and mark file as failed
						const response1 = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.query(defaultQueryParameters);

						expect(response1.status).toEqual(404);
						expect(response1.body.message).toEqual(ErrorType.PREVIEW_NOT_POSSIBLE);

						// Verify the file is marked as preview generation failed in database
						const fileRecord = await em.findOneOrFail(FileRecordEntity, uploadedFile.id);
						expect(fileRecord.previewGenerationFailed).toBe(true);

						// Second request - should fail immediately without attempting preview
						const response2 = await loggedInClient
							.get(`/preview/${uploadedFile.id}/${uploadedFile.name}`)
							.query(defaultQueryParameters);

						expect(response2.status).toEqual(404);
						expect(response2.body.message).toEqual(ErrorType.PREVIEW_NOT_POSSIBLE);
					});
				});
			});
		});
	});
});
