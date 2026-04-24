import { createMock } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { jwtPayloadFactory } from '@infra/auth-guard/testing';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { ApiValidationError } from '@infra/error';
import { S3ClientAdapter } from '@infra/s3-client';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';
import { FileRecordEntity } from '../../../repo';
import { fileRecordEntityFactory } from '../../../testing';
import { FileRecordResponse } from '../../dto';
import { availableStorageLocations } from './mocks';

const baseRouteName = '';

jest.mock('../../../domain/utils/detect-mime-type.utils');

describe(`${baseRouteName} (api)`, () => {
	let app: INestApplication;
	let em: EntityManager;

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
	});

	afterAll(async () => {
		await app.close();
	});

	describe('delete files of storage location', () => {
		describe('when not authenticated user', () => {
			it('should return status 401', async () => {
				const client = TestApiClient.createUnauthenticated(app, baseRouteName);

				const result = await client.delete(`admin/file/storage-location/school/123`);

				expect(result.status).toEqual(401);
			});
		});

		describe('when bad request data', () => {
			const setup = () => {
				const jwtPayload = jwtPayloadFactory.build();
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName, jwtPayload);

				const validId = new ObjectId().toHexString();

				return { loggedInClient, validId };
			};

			it('should return status 400 for invalid storageLocationId', async () => {
				const { loggedInClient } = setup();

				const result = await loggedInClient.delete(`admin/file/storage-location/school/123`);
				const { validationErrors } = result.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: ['storageLocationId must be a mongodb id'],
						field: ['storageLocationId'],
					},
				]);
				expect(result.status).toEqual(400);
			});

			it('should return status 400 for invalid storageLocation', async () => {
				const { loggedInClient, validId } = setup();

				const result = await loggedInClient.delete(`admin/file/storage-location/wrongLocation/${validId}`);
				const { validationErrors } = result.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: [`storageLocation must be one of the following values: ${availableStorageLocations}`],
						field: ['storageLocation'],
					},
				]);
				expect(result.status).toEqual(400);
			});
		});

		describe(`when valid request data`, () => {
			const uploadFile = async (
				loggedInClient: TestApiClient,
				schoolId: string,
				parentId: string,
				fileName: string
			) => {
				const response = await loggedInClient
					.post(`file/upload/school/${schoolId}/schools/${parentId}`)
					.attach('file', Buffer.from('abcd'), fileName)
					.set('connection', 'keep-alive')
					.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');

				return response.body as FileRecordResponse;
			};

			const setup = async () => {
				const jwtPayload = jwtPayloadFactory.build();

				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName, jwtPayload);

				const storageLocationId1 = new ObjectId().toHexString();
				const fileRecords1 = fileRecordEntityFactory.buildList(3, {
					storageLocationId: storageLocationId1,
				});

				const storageLocationId2 = new ObjectId().toHexString();
				const fileRecords2 = fileRecordEntityFactory.buildList(3, {
					storageLocationId: storageLocationId2,
				});

				const markedForDeleteFileRecords = fileRecordEntityFactory.withDeletedSince().buildList(3, {
					storageLocationId: storageLocationId1,
				});

				await em.persistAndFlush([...fileRecords1, ...fileRecords2, ...markedForDeleteFileRecords]);
				em.clear();

				jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('application/octet-stream');

				await uploadFile(loggedInClient, storageLocationId1, storageLocationId1, 'test1.txt');

				return { loggedInClient, storageLocationId1 };
			};

			it('should return right type of data', async () => {
				const { loggedInClient, storageLocationId1 } = await setup();

				const result = await loggedInClient.delete(`admin/file/storage-location/school/${storageLocationId1}`);

				expect(result.status).toEqual(200);
				expect(result.body).toEqual({
					deletedFiles: 4,
					storageLocation: 'school',
					storageLocationId: storageLocationId1,
				});
			});

			it('should set deletedSince in database', async () => {
				const { loggedInClient, storageLocationId1 } = await setup();

				await loggedInClient.delete(`admin/file/storage-location/school/${storageLocationId1}`);

				const fileRecords = await em.find(FileRecordEntity, { storageLocationId: storageLocationId1 });
				fileRecords.forEach((fileRecord) => {
					expect(fileRecord).toMatchObject({
						deletedSince: expect.any(Date),
					});
				});
			});
		});
	});
});
