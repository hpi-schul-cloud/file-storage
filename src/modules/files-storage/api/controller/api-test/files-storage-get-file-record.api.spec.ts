import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { ApiValidationError } from '@infra/error';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import { FileRecordParentType, PreviewStatus, StorageLocation } from '../../../domain';
import { fileRecordEntityFactory } from '../../../testing';
import { FileRecordResponse } from '../../dto';

const baseRouteName = '/file';

describe(`${baseRouteName}/:fileRecordId (api)`, () => {
	let app: INestApplication;
	let em: EntityManager;
	let testApiClient: TestApiClient;
	let authorizationClient: DeepMocked<AuthorizationClientAdapter>;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [FilesStorageTestModule],
		})
			.overrideProvider(NodeClam)
			.useValue(createMock<NodeClam>())
			.overrideProvider(AuthorizationClientAdapter)
			.useValue(createMock<AuthorizationClientAdapter>())
			.compile();

		app = module.createNestApplication();
		await app.init();
		em = module.get(EntityManager);
		authorizationClient = module.get(AuthorizationClientAdapter);
		testApiClient = new TestApiClient(app, baseRouteName);
	});

	afterAll(async () => {
		await app.close();
	});

	describe('with not authenticated user', () => {
		it('should return status 401', async () => {
			const fileRecordId = new ObjectId().toHexString();
			const response = await testApiClient.get(`/${fileRecordId}`);

			expect(response.status).toEqual(401);
		});
	});

	describe('with bad request data', () => {
		const setup = () => {
			const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
			const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

			return { loggedInClient };
		};

		it('should return status 400 for invalid fileRecordId', async () => {
			const { loggedInClient } = setup();
			const response = await loggedInClient.get('/invalid-id');
			const { validationErrors } = response.body as ApiValidationError;

			expect(response.status).toEqual(400);
			expect(validationErrors).toEqual([
				{
					errors: ['fileRecordId must be a mongodb id'],
					field: ['fileRecordId'],
				},
			]);
		});
	});

	describe('with valid request data', () => {
		const setup = async () => {
			const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
			const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

			const fileRecord = fileRecordEntityFactory.build();

			await em.persistAndFlush(fileRecord);
			em.clear();

			return { loggedInClient, fileRecord };
		};

		it('should return status 200 for successful request', async () => {
			const { loggedInClient, fileRecord } = await setup();

			const response = await loggedInClient.get(`/${fileRecord.id}`);

			expect(response.status).toEqual(200);
		});

		it('should return the correct file record data', async () => {
			const { loggedInClient, fileRecord } = await setup();

			const result = await loggedInClient.get(`/${fileRecord.id}`);
			const response = result.body as FileRecordResponse;

			expect(response).toStrictEqual({
				id: fileRecord.id,
				name: fileRecord.name,
				url: expect.any(String),
				parentId: fileRecord.parentId,
				parentType: fileRecord.parentType,
				creatorId: fileRecord.creatorId,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
				mimeType: fileRecord.mimeType,
				size: fileRecord.size,
				securityCheckStatus: fileRecord.securityCheck.status,
				previewStatus: PreviewStatus.PREVIEW_NOT_POSSIBLE_WRONG_MIME_TYPE,
				isCollaboraEditable: false,
				exceedsCollaboraEditableFileSize: false,
				contentLastModifiedAt: expect.any(String),
			});
		});

		it('should return status 404 for non-existing file record', async () => {
			const { loggedInClient } = await setup();
			const nonExistingId = new ObjectId().toHexString();

			const response = await loggedInClient.get(`/${nonExistingId}`);

			expect(response.status).toEqual(404);
		});

		it('should return correct URL format', async () => {
			const { loggedInClient, fileRecord } = await setup();

			const result = await loggedInClient.get(`/${fileRecord.id}`);
			const response = result.body as FileRecordResponse;

			expect(response.url).toMatch(
				new RegExp(`/file/download/${fileRecord.id}/${encodeURIComponent(fileRecord.name)}`)
			);
		});

		it('should include all required fields in response', async () => {
			const { loggedInClient, fileRecord } = await setup();

			const result = await loggedInClient.get(`/${fileRecord.id}`);
			const response = result.body as FileRecordResponse;

			// Check all required fields are present
			expect(response.id).toBeDefined();
			expect(response.name).toBeDefined();
			expect(response.url).toBeDefined();
			expect(response.parentId).toBeDefined();
			expect(response.parentType).toBeDefined();
			expect(response.creatorId).toBeDefined();
			expect(response.createdAt).toBeDefined();
			expect(response.updatedAt).toBeDefined();
			expect(response.mimeType).toBeDefined();
			expect(response.size).toBeDefined();
			expect(response.securityCheckStatus).toBeDefined();
			expect(response.previewStatus).toBeDefined();
			expect(typeof response.isCollaboraEditable).toBe('boolean');
			expect(typeof response.exceedsCollaboraEditableFileSize).toBe('boolean');
		});

		it('should handle different file types correctly', async () => {
			const { loggedInClient } = await setup();

			const imageFileRecord = fileRecordEntityFactory.build({
				storageLocation: StorageLocation.SCHOOL,
				parentType: FileRecordParentType.School,
				mimeType: 'image/jpeg',
				name: 'test-image.jpg',
			});

			await em.persistAndFlush(imageFileRecord);
			em.clear();

			const result = await loggedInClient.get(`/${imageFileRecord.id}`);
			const response = result.body as FileRecordResponse;

			expect(response.mimeType).toEqual('image/jpeg');
			expect(response.name).toEqual('test-image.jpg');
		});

		it('should handle different parent types correctly', async () => {
			const { loggedInClient } = await setup();

			const userFileRecord = fileRecordEntityFactory.build({
				storageLocation: StorageLocation.SCHOOL,
				parentType: FileRecordParentType.User,
			});

			await em.persistAndFlush(userFileRecord);
			em.clear();

			const result = await loggedInClient.get(`/${userFileRecord.id}`);
			const response = result.body as FileRecordResponse;

			expect(response.parentType).toEqual('users');
		});
	});

	describe('authorization', () => {
		const setup = async () => {
			const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
			const { teacherUser, teacherAccount } = UserAndAccountTestFactory.buildTeacher();

			const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);
			const teacherClient = testApiClient.loginByUser(teacherAccount, teacherUser);

			const fileRecord = fileRecordEntityFactory.build({
				storageLocation: StorageLocation.SCHOOL,
				parentType: FileRecordParentType.School,
				creatorId: studentUser.id,
			});

			await em.persistAndFlush(fileRecord);
			em.clear();

			authorizationClient.checkPermissionsByReference.mockRejectedValueOnce(new ForbiddenException());

			return { loggedInClient, teacherClient, fileRecord };
		};

		it('should handle authorization errors appropriately', async () => {
			const { teacherClient, fileRecord } = await setup();

			const response = await teacherClient.get(`/${fileRecord.id}`);

			expect(response.status).toEqual(403);
		});
	});
});
