import { createMock } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { ApiValidationError } from '@infra/error';
import { S3ClientAdapter } from '@infra/s3-client';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import { FileRecordParentType, StorageLocation } from '../../../domain';
import FileType from '../../../domain/service/file-type.helper';
import { FilesStorageTestModule } from '../../../files-storage-test.module';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';
import { fileRecordEntityFactory } from '../../../testing';
import { FileRecordListResponse, FileRecordResponse } from '../../dto';
import { availableParentTypes } from './mocks';

const baseRouteName = '/file';

jest.mock('../../../domain/service/file-type.helper');

describe(`${baseRouteName} (api)`, () => {
	let app: INestApplication;
	let em: EntityManager;
	let testApiClient: TestApiClient;

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
		testApiClient = new TestApiClient(app, baseRouteName);
	});

	afterAll(async () => {
		await app.close();
	});

	describe('copy files of parent', () => {
		describe('with not authenticated user', () => {
			const setup = () => {
				const copyFilesParams = {
					target: {
						storageLocation: StorageLocation.SCHOOL,
						storageLocationId: '123',
						parentId: '123',
						parentType: FileRecordParentType.Course,
					},
				};

				return { copyFilesParams };
			};

			it('should return status 401', async () => {
				const { copyFilesParams } = setup();

				const result = await testApiClient.post(`/copy/school/123/users/123`, copyFilesParams);

				expect(result.status).toEqual(401);
			});
		});

		describe('with bad request data', () => {
			const setup = () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();

				const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

				const validId = new ObjectId().toHexString();
				const targetParentId = new ObjectId().toHexString();

				const copyFilesParams = {
					target: {
						storageLocation: StorageLocation.SCHOOL,
						storageLocationId: validId,
						parentId: targetParentId,
						parentType: FileRecordParentType.Course,
					},
				};

				return { loggedInClient, validId, copyFilesParams };
			};

			it('should return status 400 for invalid schoolId', async () => {
				const { loggedInClient, validId, copyFilesParams } = setup();

				const result = await loggedInClient.post(`/copy/school/123/users/${validId}`, copyFilesParams);
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
				const { loggedInClient, validId, copyFilesParams } = setup();

				const result = await loggedInClient.post(`/copy/school/${validId}/users/123`, copyFilesParams);
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
				const { loggedInClient, validId, copyFilesParams } = setup();

				const result = await loggedInClient.post(`/copy/school/${validId}/cookies/${validId}`, copyFilesParams);
				const { validationErrors } = result.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: [`parentType must be one of the following values: ${availableParentTypes}`],
						field: ['parentType'],
					},
				]);
				expect(result.status).toEqual(400);
			});

			it('should return status 400 for invalid parentType', async () => {
				const { loggedInClient, validId } = setup();
				const params = {
					target: {
						storageLocation: StorageLocation.SCHOOL,
						storageLocationId: 'invalidObjectId',
						parentId: 'invalidObjectId',
						parentType: FileRecordParentType.Task,
					},
				};

				const response = await loggedInClient.post(`/copy/school/${validId}/users/${validId}`, params);

				expect(response.status).toEqual(400);
			});
		});

		describe(`with valid request data`, () => {
			const setup = () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();

				const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

				const validId = new ObjectId().toHexString();
				const targetParentId = new ObjectId().toHexString();

				const copyFilesParams = {
					target: {
						storageLocation: StorageLocation.SCHOOL,
						storageLocationId: validId,
						parentId: targetParentId,
						parentType: FileRecordParentType.Course,
					},
				};

				jest.spyOn(FileType, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));

				return { validId, copyFilesParams, loggedInClient };
			};

			it('should return right type of data', async () => {
				const { validId, copyFilesParams, loggedInClient } = setup();

				await loggedInClient
					.post(`/upload/school/${validId}/schools/${validId}`)
					.attach('file', Buffer.from('abcd'), 'test1.txt')
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');
				const result = await loggedInClient.post(`/copy/school/${validId}/schools/${validId}`, copyFilesParams);
				const response = result.body as FileRecordListResponse;

				expect(result.status).toEqual(201);
				expect(Array.isArray(response.data)).toBe(true);
				expect(response.data[0]).toBeDefined();
				expect(response.data[0]).toStrictEqual({
					id: expect.any(String),
					name: expect.any(String),
					sourceId: expect.any(String),
				});
			});
		});
	});

	describe('copy single file', () => {
		describe('with not authenticated user', () => {
			const setup = () => {
				const copyFileParams = {
					target: {
						storageLocation: StorageLocation.SCHOOL,
						storageLocationId: '123',
						parentId: '123',
						parentType: FileRecordParentType.Course,
					},
					fileNamePrefix: 'copy from',
				};

				return { copyFileParams };
			};

			it('should return status 401', async () => {
				const { copyFileParams } = setup();

				const response = await testApiClient.post(`/copy/123`, copyFileParams);

				expect(response.status).toEqual(401);
			});
		});

		describe('with bad request data', () => {
			const setup = () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();

				const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

				const validId = new ObjectId().toHexString();
				const targetParentId = new ObjectId().toHexString();

				const copyFileParams = {
					target: {
						storageLocation: StorageLocation.SCHOOL,
						storageLocationId: validId,
						parentId: targetParentId,
						parentType: FileRecordParentType.Course,
					},
					fileNamePrefix: 'copy from',
				};

				return { validId, copyFileParams, loggedInClient };
			};

			it('should return status 400 for invalid fileRecordId', async () => {
				const { loggedInClient, copyFileParams } = setup();

				const response = await loggedInClient.post(`/copy/123`, copyFileParams);
				const { validationErrors } = response.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: ['fileRecordId must be a mongodb id'],
						field: ['fileRecordId'],
					},
				]);
				expect(response.status).toEqual(400);
			});
		});

		describe(`with valid request data`, () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();

				const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

				const validId = new ObjectId().toHexString();
				const targetParentId = new ObjectId().toHexString();

				const copyFileParams = {
					target: {
						storageLocation: StorageLocation.SCHOOL,
						storageLocationId: validId,
						parentId: targetParentId,
						parentType: FileRecordParentType.Course,
					},
					fileNamePrefix: 'copy from',
				};

				const result = await loggedInClient
					.post(`/upload/school/${validId}/schools/${validId}`)
					.attach('file', Buffer.from('abcd'), 'test1.txt')
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');
				const response = result.body as FileRecordResponse;

				const fileRecordId = response.id;

				return { validId, copyFileParams, loggedInClient, fileRecordId };
			};

			it('should return status 200 for successful request', async () => {
				const { fileRecordId, copyFileParams, loggedInClient } = await setup();

				const response = await loggedInClient.post(`/copy/${fileRecordId}`, copyFileParams);

				expect(response.status).toEqual(201);
			});

			it('should return right type of data', async () => {
				const { fileRecordId, copyFileParams, loggedInClient } = await setup();

				const result = await loggedInClient.post(`/copy/${fileRecordId}`, copyFileParams);
				const response = result.body as FileRecordResponse;

				expect(response).toStrictEqual({
					id: expect.any(String),
					name: expect.any(String),
					sourceId: expect.any(String),
				});
			});

			it('should return elements not equal of requested scope', async () => {
				const { fileRecordId, copyFileParams, loggedInClient } = await setup();

				const otherFileRecords = fileRecordEntityFactory.buildList(3, {
					parentType: FileRecordParentType.School,
				});

				await em.persistAndFlush(otherFileRecords);
				em.clear();
				const result = await loggedInClient.post(`/copy/${fileRecordId}`, copyFileParams);
				const response = result.body as FileRecordResponse;

				expect(response.id).not.toEqual(fileRecordId);
			});
		});
	});
});
