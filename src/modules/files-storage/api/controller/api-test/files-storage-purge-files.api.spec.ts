import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { AuthorizationManyReferencesForbiddenLoggableException } from '@infra/authorization-client/error';
import { ApiValidationError } from '@infra/error';
import { S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TestApiClient } from '@testing/test-api-client';
import { PreviewStatus } from '../../../domain';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';
import { FileRecordListResponse, FileRecordResponse } from '../../dto';

const baseRouteName = '/file';

jest.mock('../../../domain/utils/detect-mime-type.utils');

describe(`${baseRouteName} (api)`, () => {
	let app: INestApplication;
	let authorizationClientAdapter: DeepMocked<AuthorizationClientAdapter>;
	let storageClient: DeepMocked<S3ClientAdapter>;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [FilesStorageTestModule],
		})
			.overrideProvider(FILES_STORAGE_S3_CONNECTION)
			.useValue(createMock<S3ClientAdapter>())
			.overrideProvider(AuthorizationClientAdapter)
			.useValue(createMock<AuthorizationClientAdapter>())
			.compile();

		app = module.createNestApplication();
		await app.init();
		authorizationClientAdapter = module.get(AuthorizationClientAdapter);
		storageClient = module.get(FILES_STORAGE_S3_CONNECTION);
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('purge files', () => {
		describe('with not authenticated user', () => {
			it('should return status 401', async () => {
				const testApiClient = TestApiClient.createUnauthenticated(app, baseRouteName);
				const fileRecordIds = { fileRecordIds: [new ObjectId().toHexString()] };

				const result = await testApiClient.delete(`/purge`, fileRecordIds);

				expect(result.status).toEqual(401);
			});
		});

		describe('with bad request data', () => {
			const setup = () => {
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

				return { loggedInClient };
			};

			it('should return status 400 for invalid fileRecordId', async () => {
				const { loggedInClient } = setup();
				const fileRecordIds = { fileRecordIds: ['123'] };

				const result = await loggedInClient.delete(`/purge`, fileRecordIds);
				const { validationErrors } = result.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: ['each value in fileRecordIds must be a mongodb id'],
						field: ['fileRecordIds'],
					},
				]);
				expect(result.status).toEqual(400);
			});
		});

		describe('with valid request data', () => {
			const uploadFile = async (
				loggedInClient: TestApiClient,
				schoolId: string,
				parentId: string,
				fileName: string
			) => {
				const result = await loggedInClient
					.post(`/upload/school/${schoolId}/schools/${parentId}`)
					.attach('file', Buffer.from('abcd'), fileName)
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');

				return result.body as FileRecordResponse;
			};

			describe('with single parent', () => {
				const setup = async () => {
					const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);
					const validId = new ObjectId().toHexString();

					jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

					const uploadedFile1 = await uploadFile(loggedInClient, validId, validId, 'test1.txt');
					const uploadedFile2 = await uploadFile(loggedInClient, validId, validId, 'test2.txt');

					await loggedInClient.delete(`/delete`, { fileRecordIds: [uploadedFile1.id, uploadedFile2.id] });

					const fileRecordIds = { fileRecordIds: [uploadedFile1.id, uploadedFile2.id] };

					return { loggedInClient, fileRecordIds, validId };
				};

				it('should return status 200 for successful request', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					const result = await loggedInClient.delete(`/purge`, fileRecordIds);

					expect(result.status).toEqual(200);
				});

				it('should return right type of data', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					const result = await loggedInClient.delete(`/purge`, fileRecordIds);
					const response = result.body as FileRecordListResponse;

					expect(response).toStrictEqual({
						data: [
							{
								creatorId: expect.any(String),
								id: expect.any(String),
								name: expect.any(String),
								url: expect.any(String),
								parentId: expect.any(String),
								createdAt: expect.any(String),
								updatedAt: expect.any(String),
								parentType: 'schools',
								mimeType: 'text/plain',
								deletedSince: expect.any(String),
								securityCheckStatus: 'pending',
								size: expect.any(Number),
								previewStatus: PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
								isCollaboraEditable: true,
								exceedsCollaboraEditableFileSize: false,
								contentLastModifiedAt: expect.any(String),
							},
							{
								creatorId: expect.any(String),
								id: expect.any(String),
								name: expect.any(String),
								url: expect.any(String),
								parentId: expect.any(String),
								createdAt: expect.any(String),
								updatedAt: expect.any(String),
								parentType: 'schools',
								mimeType: 'text/plain',
								deletedSince: expect.any(String),
								securityCheckStatus: 'pending',
								size: expect.any(Number),
								previewStatus: PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
								isCollaboraEditable: true,
								exceedsCollaboraEditableFileSize: false,
								contentLastModifiedAt: expect.any(String),
							},
						],
						total: 2,
					});
				});

				it('should call checkPermissionsByManyReferences only once for file records with same parent', async () => {
					const { loggedInClient, fileRecordIds } = await setup();
					jest.clearAllMocks();

					await loggedInClient.delete(`/purge`, fileRecordIds);

					expect(authorizationClientAdapter.checkPermissionsByManyReferences).toHaveBeenCalledTimes(1);
				});
			});

			describe('with two different parents', () => {
				const setup = async () => {
					const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

					const validId1 = new ObjectId().toHexString();
					const validId2 = new ObjectId().toHexString();

					jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

					const uploadedFile1 = await uploadFile(loggedInClient, validId1, validId1, 'test1.txt');
					const uploadedFile2 = await uploadFile(loggedInClient, validId2, validId2, 'test2.txt');

					await loggedInClient.delete(`/delete`, { fileRecordIds: [uploadedFile1.id, uploadedFile2.id] });

					const fileRecordIds = { fileRecordIds: [uploadedFile1.id, uploadedFile2.id] };

					return { loggedInClient, fileRecordIds };
				};

				it('should return status 200 for successful request', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					const result = await loggedInClient.delete(`/purge`, fileRecordIds);

					expect(result.status).toEqual(200);
				});

				it('should return right type of data', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					const result = await loggedInClient.delete(`/purge`, fileRecordIds);
					const response = result.body as FileRecordListResponse;

					expect(response).toStrictEqual({
						data: [
							{
								creatorId: expect.any(String),
								id: expect.any(String),
								name: expect.any(String),
								url: expect.any(String),
								parentId: expect.any(String),
								createdAt: expect.any(String),
								updatedAt: expect.any(String),
								parentType: 'schools',
								mimeType: 'text/plain',
								deletedSince: expect.any(String),
								securityCheckStatus: 'pending',
								size: expect.any(Number),
								previewStatus: PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
								isCollaboraEditable: true,
								exceedsCollaboraEditableFileSize: false,
								contentLastModifiedAt: expect.any(String),
							},
							{
								creatorId: expect.any(String),
								id: expect.any(String),
								name: expect.any(String),
								url: expect.any(String),
								parentId: expect.any(String),
								createdAt: expect.any(String),
								updatedAt: expect.any(String),
								parentType: 'schools',
								mimeType: 'text/plain',
								deletedSince: expect.any(String),
								securityCheckStatus: 'pending',
								size: expect.any(Number),
								previewStatus: PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
								isCollaboraEditable: true,
								exceedsCollaboraEditableFileSize: false,
								contentLastModifiedAt: expect.any(String),
							},
						],
						total: 2,
					});
				});
			});

			describe('when authorization fails', () => {
				const setup = async () => {
					const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);
					const validId = new ObjectId().toHexString();

					jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

					const uploadedFile = await uploadFile(loggedInClient, validId, validId, 'test1.txt');

					await loggedInClient.delete(`/delete`, { fileRecordIds: [uploadedFile.id] });

					const fileRecordIds = { fileRecordIds: [uploadedFile.id] };

					return { loggedInClient, fileRecordIds };
				};

				it('should return status 403', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					authorizationClientAdapter.checkPermissionsByManyReferences.mockRejectedValueOnce(
						new AuthorizationManyReferencesForbiddenLoggableException([])
					);

					const result = await loggedInClient.delete(`/purge`, fileRecordIds);

					expect(result.body).toEqual({
						code: 403,
						message: 'Forbidden',
						title: 'Authorization Many References Forbidden',
						type: 'AUTHORIZATION_MANY_REFERENCES_FORBIDDEN',
					});
				});
			});

			describe('when storage client rejects', () => {
				const setup = async () => {
					const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);
					const validId = new ObjectId().toHexString();

					jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

					const uploadedFile = await uploadFile(loggedInClient, validId, validId, 'test1.txt');

					await loggedInClient.delete(`/delete`, { fileRecordIds: [uploadedFile.id] });

					storageClient.delete.mockRejectedValueOnce(new Error('Storage client error'));

					const fileRecordIds = { fileRecordIds: [uploadedFile.id] };

					return { loggedInClient, fileRecordIds };
				};

				it('should return status 500', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					const result = await loggedInClient.delete(`/purge`, fileRecordIds);

					expect(result.status).toEqual(500);
				});
			});
		});
	});
});
