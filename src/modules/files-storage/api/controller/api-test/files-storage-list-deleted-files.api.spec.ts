import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { ApiValidationError } from '@infra/error';
import { S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityId } from '@shared/domain/types';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import { FileRecordParentType, PreviewStatus } from '../../../domain';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';
import { FileRecordListResponse, FileRecordResponse } from '../../dto';
import { availableParentTypes } from './mocks';

const baseRouteName = '/file/list-deleted';

jest.mock('../../../domain/utils/detect-mime-type.utils');

describe(`${baseRouteName} (api)`, () => {
	let app: INestApplication;
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
		authorizationClientAdapter = module.get(AuthorizationClientAdapter);
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('with not authenticated user', () => {
		it('should return status 401', async () => {
			const response = await TestApiClient.createUnauthenticated(app, baseRouteName).get(`/school/123/users/123`);

			expect(response.status).toEqual(401);
		});
	});

	describe('with bad request data', () => {
		const setup = () => {
			const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);

			const validId = new ObjectId().toHexString();

			return { loggedInClient, validId };
		};

		it('should return status 400 for invalid storageLocationId', async () => {
			const { loggedInClient, validId } = setup();

			const response = await loggedInClient.get(`/school/123/users/${validId}`);
			const { validationErrors } = response.body as ApiValidationError;

			expect(response.status).toEqual(400);
			expect(validationErrors).toEqual([
				{
					errors: ['storageLocationId must be a mongodb id'],
					field: ['storageLocationId'],
				},
			]);
		});

		it('should return status 400 for invalid parentId', async () => {
			const { loggedInClient, validId } = setup();

			const response = await loggedInClient.get(`/school/${validId}/users/123`);
			const { validationErrors } = response.body as ApiValidationError;

			expect(response.status).toEqual(400);
			expect(validationErrors).toEqual([
				{
					errors: ['parentId must be a mongodb id'],
					field: ['parentId'],
				},
			]);
		});

		it('should return status 400 for invalid parentType', async () => {
			const { loggedInClient, validId } = setup();

			const response = await loggedInClient.get(`/school/${validId}/cookies/${validId}`);
			const { validationErrors } = response.body as ApiValidationError;

			expect(response.status).toEqual(400);
			expect(validationErrors).toEqual([
				{
					errors: [`parentType must be one of the following values: ${availableParentTypes}`],
					field: ['parentType'],
				},
			]);
		});
	});

	describe('with valid request data', () => {
		const uploadFile = async (loggedInClient: TestApiClient, schoolId: string, parentId: string, fileName: string) => {
			const response = await loggedInClient
				.post(`/upload/school/${schoolId}/schools/${parentId}`)
				.attach('file', Buffer.from('abcd'), fileName)
				.set('connection', 'keep-alive')
				.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');

			return response.body as FileRecordResponse;
		};

		const setup = () => {
			const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);
			// separate client for upload/delete operations (base: /file)
			const fileApiClient = TestApiClient.createWithJwt(app, '/file');

			const validId = new ObjectId().toHexString();

			jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

			return { loggedInClient, fileApiClient, validId };
		};

		it('should return status 200 for successful request', async () => {
			const { loggedInClient, validId } = setup();

			const response = await loggedInClient.get(`/school/${validId}/schools/${validId}`);

			expect(response.status).toEqual(200);
		});

		it('should return a paginated result as default', async () => {
			const { loggedInClient, validId } = setup();

			const result = await loggedInClient.get(`/school/${validId}/schools/${validId}`);
			const response = result.body as FileRecordListResponse;

			expect(response).toEqual({
				total: 0,
				limit: 10,
				skip: 0,
				data: [],
			});
		});

		it('should pass the pagination query params', async () => {
			const { loggedInClient, validId } = setup();

			const result = await loggedInClient.get(`/school/${validId}/schools/${validId}`).query({ limit: 100, skip: 100 });
			const response = result.body as FileRecordListResponse;

			expect(response.limit).toEqual(100);
			expect(response.skip).toEqual(100);
		});

		it('should apply limit to returned data', async () => {
			const { loggedInClient, fileApiClient, validId } = setup();

			const file1 = await uploadFile(fileApiClient, validId, validId, 'limit-test1.txt');
			const file2 = await uploadFile(fileApiClient, validId, validId, 'limit-test2.txt');
			const file3 = await uploadFile(fileApiClient, validId, validId, 'limit-test3.txt');

			await fileApiClient.delete(`/delete/${file1.id}`);
			await fileApiClient.delete(`/delete/${file2.id}`);
			await fileApiClient.delete(`/delete/${file3.id}`);

			const result = await loggedInClient.get(`/school/${validId}/schools/${validId}`).query({ limit: 2 });
			const response = result.body as FileRecordListResponse;

			expect(response.total).toEqual(3);
			expect(response.data.length).toEqual(2);
		});

		it('should apply skip to returned data', async () => {
			const { loggedInClient, fileApiClient, validId } = setup();

			const file1 = await uploadFile(fileApiClient, validId, validId, 'skip-test1.txt');
			const file2 = await uploadFile(fileApiClient, validId, validId, 'skip-test2.txt');
			const file3 = await uploadFile(fileApiClient, validId, validId, 'skip-test3.txt');

			await fileApiClient.delete(`/delete/${file1.id}`);
			await fileApiClient.delete(`/delete/${file2.id}`);
			await fileApiClient.delete(`/delete/${file3.id}`);

			const result = await loggedInClient.get(`/school/${validId}/schools/${validId}`).query({ skip: 2 });
			const response = result.body as FileRecordListResponse;

			expect(response.total).toEqual(3);
			expect(response.data.length).toEqual(1);
		});

		it('should only return deleted files', async () => {
			const { loggedInClient, fileApiClient, validId } = setup();

			await uploadFile(fileApiClient, validId, validId, 'test-active.txt');
			const deletedFile = await uploadFile(fileApiClient, validId, validId, 'test-deleted.txt');

			await fileApiClient.delete(`/delete/${deletedFile.id}`);

			const result = await loggedInClient.get(`/school/${validId}/schools/${validId}`);
			const response = result.body as FileRecordListResponse;

			expect(response.total).toEqual(1);
			expect(response.data[0].id).toEqual(deletedFile.id);
		});

		it('should return right type of data including deletedSince', async () => {
			const { loggedInClient, fileApiClient, validId } = setup();

			const uploadedFile = await uploadFile(fileApiClient, validId, validId, 'test1.txt');
			await fileApiClient.delete(`/delete/${uploadedFile.id}`);

			const result = await loggedInClient.get(`/school/${validId}/schools/${validId}`);
			const response = result.body as FileRecordListResponse;

			expect(Array.isArray(response.data)).toBe(true);
			expect(response.data[0]).toStrictEqual({
				creatorId: expect.any(String),
				id: expect.any(String),
				name: expect.any(String),
				url: expect.any(String),
				parentId: expect.any(String),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
				parentType: FileRecordParentType.School,
				mimeType: 'text/plain',
				deletedSince: expect.any(String),
				securityCheckStatus: 'pending',
				size: expect.any(Number),
				previewStatus: PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
				isCollaboraEditable: true,
				exceedsCollaboraEditableFileSize: false,
				contentLastModifiedAt: expect.any(String),
			});
		});

		it('should return only elements of the requested parent scope', async () => {
			const { loggedInClient, fileApiClient, validId } = setup();
			const otherParentId = new ObjectId().toHexString();

			const fileRecords = await Promise.all([
				uploadFile(fileApiClient, validId, validId, 'test1.txt'),
				uploadFile(fileApiClient, validId, validId, 'test2.txt'),
				uploadFile(fileApiClient, validId, validId, 'test3.txt'),
				uploadFile(fileApiClient, validId, otherParentId, 'other1.txt'),
				uploadFile(fileApiClient, validId, otherParentId, 'other2.txt'),
			]);

			await fileApiClient.delete(`/delete/school/${validId}/schools/${validId}`);
			await fileApiClient.delete(`/delete/school/${validId}/schools/${otherParentId}`);

			const result = await loggedInClient.get(`/school/${validId}/schools/${validId}`);
			const response = result.body as FileRecordListResponse;

			const ids: EntityId[] = response.data.map((o: FileRecordResponse) => o.id);

			expect(response.total).toEqual(3);
			expect(ids.sort()).toEqual([fileRecords[0].id, fileRecords[1].id, fileRecords[2].id].sort());
		});

		it('should not return non-deleted files', async () => {
			const { loggedInClient, fileApiClient, validId } = setup();

			await uploadFile(fileApiClient, validId, validId, 'active1.txt');
			await uploadFile(fileApiClient, validId, validId, 'active2.txt');

			const result = await loggedInClient.get(`/school/${validId}/schools/${validId}`);
			const response = result.body as FileRecordListResponse;

			expect(response.total).toEqual(0);
			expect(response.data).toEqual([]);
		});

		it('should return status 403 when authorization fails', async () => {
			const { loggedInClient, validId } = setup();

			authorizationClientAdapter.checkPermissionsByReference.mockRejectedValueOnce(new ForbiddenException());

			const response = await loggedInClient.get(`/school/${validId}/schools/${validId}`);

			expect(response.status).toEqual(403);
		});
	});
});
