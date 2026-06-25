import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { ApiValidationError } from '@infra/error';
import { S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { currentUserFactory } from '@testing/factory/currentuser.factory';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import { DocumentType } from '../../../domain';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import {
	FILE_STORAGE_CONFIG_TOKEN,
	FILES_STORAGE_S3_CONNECTION,
	FileStorageConfig,
} from '../../../files-storage.config';
import { FileRecordEntity } from '../../../repo';
import { availableParentTypes } from './mocks';

jest.mock('../../../domain/utils/detect-mime-type.utils');

const baseRouteName = '/file';

describe(`${baseRouteName}/add-document-to-parent (api)`, () => {
	let module: TestingModule;
	let app: INestApplication;
	let s3ClientAdapter: DeepMocked<S3ClientAdapter>;
	let config: FileStorageConfig;

	beforeAll(async () => {
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
		await app.init();

		s3ClientAdapter = module.get(FILES_STORAGE_S3_CONNECTION);
		config = module.get(FILE_STORAGE_CONFIG_TOKEN);
	});

	afterAll(async () => {
		await app.close();
		await module.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('add document to parent', () => {
		describe('with not authenticated user', () => {
			it('should return status 401', async () => {
				const validId = new ObjectId().toHexString();
				const unauthenticatedClient = TestApiClient.createUnauthenticated(app, baseRouteName);
				const body = { fileName: 'document.docx', documentType: DocumentType.DOCX };

				const response = await unauthenticatedClient.post(
					`/add-document-to-parent/school/${validId}/schools/${validId}`,
					body
				);

				expect(response.status).toEqual(401);
			});
		});

		describe('with bad request data', () => {
			const setup = () => {
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);
				const validId = new ObjectId().toHexString();
				const body = { fileName: 'document.docx', documentType: DocumentType.DOCX };

				return { loggedInClient, validId, body };
			};

			it('should return status 400 for invalid storageLocationId', async () => {
				const { loggedInClient, validId, body } = setup();

				const response = await loggedInClient.post(
					`/add-document-to-parent/school/invalid-id/schools/${validId}`,
					body
				);
				const { validationErrors } = response.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: ['storageLocationId must be a mongodb id'],
						field: ['storageLocationId'],
					},
				]);
				expect(response.status).toEqual(400);
			});

			it('should return status 400 for invalid parentId', async () => {
				const { loggedInClient, validId, body } = setup();

				const response = await loggedInClient.post(
					`/add-document-to-parent/school/${validId}/schools/invalid-id`,
					body
				);
				const { validationErrors } = response.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: ['parentId must be a mongodb id'],
						field: ['parentId'],
					},
				]);
				expect(response.status).toEqual(400);
			});

			it('should return status 400 for invalid parentType', async () => {
				const { loggedInClient, validId, body } = setup();

				const response = await loggedInClient.post(
					`/add-document-to-parent/school/${validId}/cookies/${validId}`,
					body
				);
				const { validationErrors } = response.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: [`parentType must be one of the following values: ${availableParentTypes}`],
						field: ['parentType'],
					},
				]);
				expect(response.status).toEqual(400);
			});

			it('should return status 400 for missing fileName and documentType', async () => {
				const { loggedInClient, validId } = setup();

				const response = await loggedInClient.post(`/add-document-to-parent/school/${validId}/schools/${validId}`, {});
				const { validationErrors } = response.body as ApiValidationError;

				expect(validationErrors).toEqual(
					expect.arrayContaining([
						{
							errors: ['fileName should not be empty', 'fileName must be a string'],
							field: ['fileName'],
						},
						{
							errors: expect.arrayContaining([expect.stringContaining('documentType must be one of')]),
							field: ['documentType'],
						},
					])
				);
				expect(response.status).toEqual(400);
			});

			it('should return status 400 for invalid documentType', async () => {
				const { loggedInClient, validId } = setup();

				const response = await loggedInClient.post(`/add-document-to-parent/school/${validId}/schools/${validId}`, {
					fileName: 'document.docx',
					documentType: 'invalid/type',
				});

				expect(response.status).toEqual(400);
			});

			it('should return status 400 for empty fileName because of sanitization', async () => {
				const { loggedInClient, validId } = setup();

				const response = await loggedInClient.post(`/add-document-to-parent/school/${validId}/schools/${validId}`, {
					fileName: '<script>',
					documentType: DocumentType.DOCX,
				});
				const { validationErrors } = response.body as ApiValidationError;

				expect(validationErrors).toEqual([
					{
						errors: ['fileName should not be empty'],
						field: ['fileName'],
					},
				]);
				expect(response.status).toEqual(400);
			});
		});

		describe('with valid request data', () => {
			const setup = (documentType = DocumentType.DOCX, fileName = 'document.docx') => {
				const currentUser = currentUserFactory.build();
				const { userId } = currentUser;
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName, currentUser);
				const validId = new ObjectId().toHexString();

				jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue(documentType);
				jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', false);

				const body = { fileName, documentType };

				return { loggedInClient, validId, userId, body, documentType };
			};

			it('should return status 201 for successful creation', async () => {
				const { loggedInClient, validId, body } = setup();

				const response = await loggedInClient.post(
					`/add-document-to-parent/school/${validId}/schools/${validId}`,
					body
				);

				expect(response.status).toEqual(201);
			});

			it('should return the new created file record', async () => {
				const { loggedInClient, validId, userId, body, documentType } = setup();

				const response = await loggedInClient.post(
					`/add-document-to-parent/school/${validId}/schools/${validId}`,
					body
				);
				const result = response.body as FileRecordEntity;

				expect(result).toStrictEqual(
					expect.objectContaining({
						id: expect.any(String),
						name: 'document.docx',
						parentId: validId,
						creatorId: userId,
						mimeType: documentType,
						parentType: 'schools',
						securityCheckStatus: 'pending',
						size: expect.any(Number),
					})
				);
			});

			it.each([
				[DocumentType.DOCX, 'document.docx'],
				[DocumentType.XLSX, 'spreadsheet.xlsx'],
				[DocumentType.PPTX, 'presentation.pptx'],
			])('should return status 201 for %s', async (documentType, fileName) => {
				const { loggedInClient, validId, body } = setup(documentType, fileName);

				const response = await loggedInClient.post(
					`/add-document-to-parent/school/${validId}/schools/${validId}`,
					body
				);

				expect(response.status).toEqual(201);
			});

			it('should set iterator number to file name if file already exists', async () => {
				const { loggedInClient, validId, body } = setup();

				await loggedInClient.post(`/add-document-to-parent/school/${validId}/schools/${validId}`, body);
				jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue(DocumentType.DOCX);

				const result = await loggedInClient.post(`/add-document-to-parent/school/${validId}/schools/${validId}`, body);

				expect((result.body as FileRecordEntity).name).toEqual('document (1).docx');
			});
		});

		describe('when s3 client throws an error', () => {
			it('should return status 500', async () => {
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);
				const validId = new ObjectId().toHexString();

				jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue(DocumentType.DOCX);
				jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', false);
				s3ClientAdapter.create.mockRejectedValueOnce(new Error('S3 error'));

				const response = await loggedInClient.post(`/add-document-to-parent/school/${validId}/schools/${validId}`, {
					fileName: 'document.docx',
					documentType: DocumentType.DOCX,
				});

				expect(response.status).toEqual(500);
			});
		});

		describe('when parent has already the maximum number of files allowed', () => {
			let defaultMaxFilesPerParent: number;

			afterEach(() => {
				config.filesStorageMaxFilesPerParent = defaultMaxFilesPerParent;
			});

			it('should return status 403', async () => {
				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);
				const validId = new ObjectId().toHexString();

				defaultMaxFilesPerParent = config.filesStorageMaxFilesPerParent;
				config.filesStorageMaxFilesPerParent = 0;

				const response = await loggedInClient.post(`/add-document-to-parent/school/${validId}/schools/${validId}`, {
					fileName: 'document.docx',
					documentType: DocumentType.DOCX,
				});

				expect(response.status).toEqual(403);
			});
		});
	});
});
