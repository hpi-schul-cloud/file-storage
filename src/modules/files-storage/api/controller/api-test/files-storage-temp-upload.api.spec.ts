import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { ApiValidationError } from '@infra/error';
import { S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import { TEMP_FILE_EXPIRY_SECONDS } from '../../../domain';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import {
	FILE_STORAGE_CONFIG_TOKEN,
	FILES_STORAGE_S3_CONNECTION,
	FileStorageConfig,
} from '../../../files-storage.config';
import { FileRecordResponse } from '../../dto';
import { availableParentTypes } from './mocks';

jest.mock('../../../domain/utils/detect-mime-type.utils');

const createRndInt = (max: number) => Math.floor(Math.random() * max);

describe('files-storage temp upload controller (API)', () => {
	let module: TestingModule;
	let app: INestApplication;
	let s3ClientAdapter: DeepMocked<S3ClientAdapter>;
	let appPort: number;
	let testApiClient: TestApiClient;
	let config: DeepMocked<FileStorageConfig>;

	const baseRouteName = '/file';

	beforeAll(async () => {
		appPort = 10000 + createRndInt(10000);

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
			.overrideProvider(FILE_STORAGE_CONFIG_TOKEN)
			.useValue(new FileStorageConfig())
			.compile();

		app = module.createNestApplication();
		const initializedApp = await app.init();
		await initializedApp.listen(appPort);

		s3ClientAdapter = module.get(FILES_STORAGE_S3_CONNECTION);
		config = module.get(FILE_STORAGE_CONFIG_TOKEN);
		testApiClient = new TestApiClient(app, baseRouteName);
	});

	afterAll(async () => {
		await app.close();
		await module.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('tempUpload action', () => {
		const setup = () => {
			const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();

			const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

			const validId = new ObjectId().toHexString();

			jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

			return { validId, loggedInClient, user: studentUser };
		};

		const uploadTempFile = async (routeName: string, apiClient: TestApiClient) => {
			const response = await apiClient
				.post(routeName)
				.attach('file', Buffer.from('abcd'), 'test.txt')
				.set('connection', 'keep-alive')
				.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');

			return response;
		};

		describe('with not authenticated user', () => {
			it('should return status 401', async () => {
				const { validId } = setup();
				const unauthenticatedClient = new TestApiClient(app, baseRouteName);

				const result = await uploadTempFile(`/temp/upload/school/123/users/${validId}`, unauthenticatedClient);

				expect(result.status).toEqual(401);
			});
		});

		describe('with bad request data', () => {
			it('should return status 400 for invalid storageLocationId', async () => {
				const { loggedInClient, validId } = setup();

				const result = await uploadTempFile(`/temp/upload/school/123/users/${validId}`, loggedInClient);
				const { validationErrors } = result.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: ['storageLocationId must be a mongodb id'],
						field: ['storageLocationId'],
					},
				]);
				expect(result.status).toEqual(400);
			});

			it('should return status 400 for invalid parentId', async () => {
				const { loggedInClient, validId } = setup();

				const result = await uploadTempFile(`/temp/upload/school/${validId}/users/123`, loggedInClient);
				const { validationErrors } = result.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: ['parentId must be a mongodb id'],
						field: ['parentId'],
					},
				]);
				expect(result.status).toEqual(400);
			});

			it('should return status 400 for invalid parentType', async () => {
				const { loggedInClient, validId } = setup();

				const result = await uploadTempFile(`/temp/upload/school/${validId}/cookies/${validId}`, loggedInClient);
				const { validationErrors } = result.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: [`parentType must be one of the following values: ${availableParentTypes}`],
						field: ['parentType'],
					},
				]);
				expect(result.status).toEqual(400);
			});
		});

		describe('with valid request data', () => {
			it('should return status 201 for successful upload', async () => {
				const { loggedInClient, validId } = setup();

				const response = await uploadTempFile(`/temp/upload/school/${validId}/schools/${validId}`, loggedInClient);

				expect(response.status).toEqual(201);
			});

			it('should return the new created file record', async () => {
				const { loggedInClient, validId, user } = setup();

				const result = await uploadTempFile(`/temp/upload/school/${validId}/schools/${validId}`, loggedInClient);
				const response = result.body as FileRecordResponse;

				expect(response).toStrictEqual(
					expect.objectContaining({
						id: expect.any(String),
						name: 'test.txt',
						parentId: validId,
						creatorId: user.id,
						mimeType: 'text/plain',
						parentType: 'schools',
						securityCheckStatus: 'pending',
						size: expect.any(Number),
					})
				);
			});

			it('should return a file record with expiresAt set', async () => {
				const { loggedInClient, validId } = setup();

				const result = await uploadTempFile(`/temp/upload/school/${validId}/schools/${validId}`, loggedInClient);
				const response = result.body as FileRecordResponse;

				const expectedExpirationTime = new Date(response.createdAt ?? 0).getTime() + TEMP_FILE_EXPIRY_SECONDS * 1000;
				expect(response.expiresAt).toBeDefined();
				expect(new Date(response.expiresAt ?? 0).getTime()).toBe(expectedExpirationTime);
			});

			describe('when file has size 0', () => {
				it('should return status 201 for successful upload', async () => {
					const { loggedInClient, validId } = setup();

					const response = await loggedInClient
						.post(`/temp/upload/school/${validId}/schools/${validId}`)
						.attach('file', Buffer.from(''), 'empty.txt')
						.set('connection', 'keep-alive')
						.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');

					expect(response.status).toEqual(201);
				});

				it('should return the new created file record', async () => {
					const { loggedInClient, validId, user } = setup();

					const result = await loggedInClient
						.post(`/temp/upload/school/${validId}/schools/${validId}`)
						.attach('file', Buffer.from(''), 'empty.txt')
						.set('connection', 'keep-alive')
						.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');
					const response = result.body as FileRecordResponse;

					expect(response).toStrictEqual(
						expect.objectContaining({
							id: expect.any(String),
							name: 'empty.txt',
							parentId: validId,
							creatorId: user.id,
							mimeType: 'text/plain',
							parentType: 'schools',
							securityCheckStatus: 'pending',
							size: 0,
						})
					);
				});
			});
		});

		describe('when s3 upload fails', () => {
			it('should return status 500', async () => {
				const { loggedInClient, validId } = setup();
				s3ClientAdapter.create.mockRejectedValueOnce(new Error('S3 upload failed'));

				const response = await uploadTempFile(`/temp/upload/school/${validId}/schools/${validId}`, loggedInClient);

				expect(response.status).toEqual(500);
			});
		});

		describe('when parent has already the maximum number of files allowed', () => {
			let defaultMaxFilesPerParent: number;

			afterEach(() => {
				config.filesStorageMaxFilesPerParent = defaultMaxFilesPerParent;
			});

			it('should return status 403 with FILE_LIMIT_PER_PARENT_EXCEEDED error', async () => {
				const { loggedInClient, validId } = setup();

				defaultMaxFilesPerParent = config.filesStorageMaxFilesPerParent;
				config.filesStorageMaxFilesPerParent = 0;

				const response = await uploadTempFile(`/temp/upload/school/${validId}/schools/${validId}`, loggedInClient);

				expect(response.status).toEqual(403);
			});
		});
	});
});
