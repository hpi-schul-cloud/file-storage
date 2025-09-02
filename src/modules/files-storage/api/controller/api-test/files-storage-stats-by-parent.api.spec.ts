import { createMock } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { ApiValidationError } from '@infra/error';
import { S3ClientAdapter } from '@infra/s3-client';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import { FilesStorageTestModule } from '../../../../files-storage-app/testing/files-storage.test.module';
import { FileRecordParentType, StorageLocation } from '../../../domain';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';
import { fileRecordEntityFactory } from '../../../testing';
import { availableParentTypes } from './mocks';

const baseRouteName = '/file/stats';

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

	describe('with not authenticated user', () => {
		it('should return status 401', async () => {
			const response = await testApiClient.get(`/users/123`);

			expect(response.status).toEqual(401);
		});
	});

	describe('with bad request data', () => {
		const setup = () => {
			const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();

			const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

			const validId = new ObjectId().toHexString();

			return { loggedInClient, validId };
		};

		it('should return status 400 for invalid parentId', async () => {
			const { loggedInClient } = setup();
			const response = await loggedInClient.get(`/users/123`);
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
			const response = await loggedInClient.get(`/cookies/${validId}`);
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
		const setup = async () => {
			const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();

			const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);

			const validId = new ObjectId().toHexString();

			const fileRecords = fileRecordEntityFactory.buildList(2, {
				storageLocation: StorageLocation.SCHOOL,
				storageLocationId: validId,
				parentId: validId,
				parentType: FileRecordParentType.School,
				size: 100,
			});
			// Set a different size for the second record for a more robust test
			fileRecords[1].size = 200;

			await em.persistAndFlush(fileRecords);
			em.clear();

			return { loggedInClient, validId, fileRecords };
		};

		it('should return status 200 and stats for successful request', async () => {
			const { loggedInClient, validId, fileRecords } = await setup();

			const response = await loggedInClient.get(`/schools/${validId}`);

			const expectedCount = fileRecords.length;
			const expectedTotalSize = fileRecords.reduce((sum, f) => sum + f.size, 0);

			expect(response.status).toEqual(HttpStatus.OK);
			expect(response.body).toEqual({ fileCount: expectedCount, totalSizeInBytes: expectedTotalSize });
		});
	});
});
