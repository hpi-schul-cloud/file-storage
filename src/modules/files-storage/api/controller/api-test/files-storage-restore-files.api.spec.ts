import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { AuthorizationManyReferencesForbiddenLoggableException } from '@infra/authorization-client/error';
import { ApiValidationError } from '@infra/error';
import { S3ClientAdapter } from '@infra/s3-client';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityId } from '@shared/domain/types';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import { FileRecordParentType, PreviewStatus } from '../../../domain';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';
import { fileRecordEntityFactory } from '../../../testing';
import { FileRecordListResponse, FileRecordResponse } from '../../dto';
import { availableParentTypes } from './mocks';

const baseRouteName = '/file';

jest.mock('../../../domain/utils/detect-mime-type.utils');

describe(`${baseRouteName} (api)`, () => {
	let app: INestApplication;
	let em: EntityManager;
	let authorizationClientAdapter: DeepMocked<AuthorizationClientAdapter>;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
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
			.compile();

		app = module.createNestApplication();
		await app.init();
		em = module.get(EntityManager);
		authorizationClientAdapter = module.get(AuthorizationClientAdapter);
	});

	afterAll(async () => {
		await app.close();
	});

	describe('restore files of parent', () => {
		describe('with not authenticated user', () => {
			it('should return status 401', async () => {
				const unauthenticatedClient = TestApiClient.createUnauthenticated(app, baseRouteName);
				const result = await unauthenticatedClient.post(`/restore/school/123/users/123`);

				expect(result.status).toEqual(401);
			});
		});

		describe('with bad request data', () => {
			const setup = () => {
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

				const validId = new ObjectId().toHexString();

				return { validId, loggedInClient };
			};

			it('should return status 400 for invalid schoolId', async () => {
				const { loggedInClient, validId } = setup();

				const result = await loggedInClient.post(`/restore/school/123/users/${validId}`);
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

				const result = await loggedInClient.post(`/restore/school/${validId}/users/123`);
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

				const result = await loggedInClient.post(`/restore/school/${validId}/cookies/${validId}`);
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

		describe(`with valid request data`, () => {
			const setup = () => {
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

				const validId = new ObjectId().toHexString();

				jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

				return { validId, loggedInClient };
			};

			const uploadFile = async (loggedInClient: TestApiClient, path: string, fileName: string) => {
				const result = await loggedInClient
					.post(path)
					.attach('file', Buffer.from('abcd'), fileName)
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');

				return result.body as FileRecordResponse;
			};

			it('should return status 200 for successful request', async () => {
				const { validId, loggedInClient } = setup();
				await uploadFile(loggedInClient, `/upload/school/${validId}/schools/${validId}`, 'test1.txt');

				await loggedInClient.delete(`/school/${validId}/schools/${validId}`);

				const response = await loggedInClient.post(`/restore/school/${validId}/schools/${validId}`);

				expect(response.status).toEqual(201);
			});

			it('should return right type of data', async () => {
				const { validId, loggedInClient } = setup();
				await uploadFile(loggedInClient, `/upload/school/${validId}/schools/${validId}`, 'test1.txt');

				await loggedInClient.delete(`/delete/school/${validId}/schools/${validId}`);

				const result = await loggedInClient.post(`/restore/school/${validId}/schools/${validId}`);
				const response = result.body as FileRecordListResponse;

				expect(Array.isArray(response.data)).toBe(true);
				expect(response.data[0]).toBeDefined();
				expect(response.data[0]).toStrictEqual({
					creatorId: expect.any(String),
					id: expect.any(String),
					name: expect.any(String),
					url: expect.any(String),
					parentId: expect.any(String),
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
					parentType: 'schools',
					mimeType: 'text/plain',
					securityCheckStatus: 'pending',
					size: expect.any(Number),
					previewStatus: PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
					isCollaboraEditable: true,
					exceedsCollaboraEditableFileSize: false,
					contentLastModifiedAt: expect.any(String),
				});
			});

			it('should return elements of requested scope', async () => {
				const { validId, loggedInClient } = setup();

				const otherParentId = new ObjectId().toHexString();
				const fileRecords = await Promise.all([
					uploadFile(loggedInClient, `/upload/school/${validId}/schools/${validId}`, 'test1.txt'),
					uploadFile(loggedInClient, `/upload/school/${validId}/schools/${validId}`, 'test2.txt'),
					uploadFile(loggedInClient, `/upload/school/${validId}/schools/${validId}`, 'test3.txt'),
					uploadFile(loggedInClient, `/upload/school/${validId}/schools/${otherParentId}`, 'other1.txt'),
					uploadFile(loggedInClient, `/upload/school/${validId}/schools/${otherParentId}`, 'other3.txt'),
					uploadFile(loggedInClient, `/upload/school/${validId}/schools/${otherParentId}`, 'other2.txt'),
				]);

				await loggedInClient.delete(`/delete/school/${validId}/schools/${validId}`);

				const result = await loggedInClient.post(`/restore/school/${validId}/schools/${validId}`);
				const response = result.body as FileRecordListResponse;

				const resultData: FileRecordResponse[] = response.data;
				const ids: EntityId[] = resultData.map((o) => o.id);

				expect(response.total).toEqual(3);
				expect(ids.sort()).toEqual([fileRecords[0].id, fileRecords[1].id, fileRecords[2].id].sort());
			});
		});
	});

	describe('restore single file', () => {
		describe('with bad request data', () => {
			const setup = () => {
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

				return { loggedInClient };
			};

			it('should return status 400 for invalid fileRecordId', async () => {
				const { loggedInClient } = setup();

				const result = await loggedInClient.post(`/restore/123`);
				const { validationErrors } = result.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: ['fileRecordId must be a mongodb id'],
						field: ['fileRecordId'],
					},
				]);
				expect(result.status).toEqual(400);
			});
		});

		describe(`with valid request data`, () => {
			const setup = async () => {
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

				const validId = new ObjectId().toHexString();

				const result = (
					await loggedInClient
						.post(`/upload/school/${validId}/schools/${validId}`)
						.attach('file', Buffer.from('abcd'), 'test1.txt')
						.set('connection', 'keep-alive')
						.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20')
				).body as FileRecordResponse;

				const fileRecordId = result.id;

				jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

				return { loggedInClient, fileRecordId };
			};

			it('should return status 200 for successful request', async () => {
				const { loggedInClient, fileRecordId } = await setup();

				await loggedInClient.delete(`/delete/${fileRecordId}`);

				const response = await loggedInClient.post(`/restore/${fileRecordId}`);

				expect(response.status).toEqual(201);
			});

			it('should return right type of data', async () => {
				const { loggedInClient, fileRecordId } = await setup();

				await loggedInClient.delete(`/delete/${fileRecordId}`);

				const result = await loggedInClient.post(`/restore/${fileRecordId}`);
				const response = result.body as FileRecordResponse;

				expect(response).toStrictEqual({
					creatorId: expect.any(String),
					id: expect.any(String),
					name: expect.any(String),
					url: expect.any(String),
					parentId: expect.any(String),
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
					parentType: 'schools',
					mimeType: 'text/plain',
					securityCheckStatus: 'pending',
					size: expect.any(Number),
					previewStatus: PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
					isCollaboraEditable: true,
					exceedsCollaboraEditableFileSize: false,
					contentLastModifiedAt: expect.any(String),
				});
			});

			it('should return elements of requested scope', async () => {
				const { loggedInClient, fileRecordId } = await setup();
				const otherFileRecords = fileRecordEntityFactory.buildList(3, {
					parentType: FileRecordParentType.School,
				});

				await em.persistAndFlush(otherFileRecords);
				em.clear();

				await loggedInClient.delete(`/delete/${fileRecordId}`);

				const result = await loggedInClient.post(`/restore/${fileRecordId}`);
				const response = result.body as FileRecordResponse;

				expect(response.id).toEqual(fileRecordId);
			});
		});
	});

	describe('restore multiple files', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		describe('with not authenticated user', () => {
			it('should return status 401', async () => {
				const validId = new ObjectId().toHexString();
				const result = await TestApiClient.createUnauthenticated(app, baseRouteName).post(`/restore`, {
					fileRecordIds: [validId],
				});

				expect(result.status).toEqual(401);
			});
		});

		describe('with bad request data', () => {
			const setup = () => {
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

				return { loggedInClient };
			};

			it('should return status 400 for invalid fileRecordId in array', async () => {
				const { loggedInClient } = setup();

				const result = await loggedInClient.post(`/restore`, { fileRecordIds: ['123'] });
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
				const response = await loggedInClient
					.post(`/upload/school/${schoolId}/schools/${parentId}`)
					.attach('file', Buffer.from('abcd'), fileName)
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');

				return response.body as FileRecordResponse;
			};

			describe('with a single parent', () => {
				const setup = async () => {
					const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

					const validId = new ObjectId().toHexString();

					jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

					const file1 = await uploadFile(loggedInClient, validId, validId, 'test1.txt');
					const file2 = await uploadFile(loggedInClient, validId, validId, 'test2.txt');

					await loggedInClient.delete(`/delete/school/${validId}/schools/${validId}`);

					const fileRecordIds = { fileRecordIds: [file1.id, file2.id] };

					return { loggedInClient, fileRecordIds, file1, file2 };
				};

				it('should return status 201 for successful request', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					const response = await loggedInClient.post(`/restore`, fileRecordIds);

					expect(response.status).toEqual(201);
				});

				it('should return right type of data', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					const result = await loggedInClient.post(`/restore`, fileRecordIds);
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
								parentType: FileRecordParentType.School,
								mimeType: 'text/plain',
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
								parentType: FileRecordParentType.School,
								mimeType: 'text/plain',
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

				it('should only restore the specified files', async () => {
					const { loggedInClient, fileRecordIds, file1, file2 } = await setup();

					const result = await loggedInClient.post(`/restore`, fileRecordIds);
					const response = result.body as FileRecordListResponse;

					const ids: EntityId[] = response.data.map((o: FileRecordResponse) => o.id);

					expect(response.total).toEqual(2);
					expect(ids.sort()).toEqual([file1.id, file2.id].sort());
				});

				it('should call checkPermissionsByManyReferences only once for files with the same parent', async () => {
					const { loggedInClient, fileRecordIds } = await setup();
					jest.clearAllMocks();

					await loggedInClient.post(`/restore`, fileRecordIds);

					expect(authorizationClientAdapter.checkPermissionsByManyReferences).toHaveBeenCalledTimes(1);
				});
			});

			describe('with two different parents', () => {
				const setup = async () => {
					const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

					const validId1 = new ObjectId().toHexString();
					const validId2 = new ObjectId().toHexString();

					jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

					const file1 = await uploadFile(loggedInClient, validId1, validId1, 'test1.txt');
					const file2 = await uploadFile(loggedInClient, validId2, validId2, 'test2.txt');

					await loggedInClient.delete(`/delete/${file1.id}`);
					await loggedInClient.delete(`/delete/${file2.id}`);

					const fileRecordIds = { fileRecordIds: [file1.id, file2.id] };

					return { loggedInClient, fileRecordIds };
				};

				it('should return status 201 and restore all specified files', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					const result = await loggedInClient.post(`/restore`, fileRecordIds);
					const response = result.body as FileRecordListResponse;

					expect(result.status).toEqual(201);
					expect(response.total).toEqual(2);
				});

				it('should return error status when authorization fails', async () => {
					const { loggedInClient, fileRecordIds } = await setup();

					authorizationClientAdapter.checkPermissionsByManyReferences.mockRejectedValueOnce(
						new AuthorizationManyReferencesForbiddenLoggableException([])
					);

					const response = await loggedInClient.post(`/restore`, fileRecordIds);

					expect(response.body).toEqual({
						code: 403,
						message: 'Forbidden',
						title: 'Authorization Many References Forbidden',
						type: 'AUTHORIZATION_MANY_REFERENCES_FORBIDDEN',
					});
				});
			});
		});
	});
});
