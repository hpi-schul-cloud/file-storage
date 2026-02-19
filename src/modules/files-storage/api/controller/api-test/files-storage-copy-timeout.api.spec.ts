import { createMock } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { S3ClientAdapter } from '@infra/s3-client';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import {
	FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN,
	RequestTimeoutConfig,
} from '@modules/files-storage-app/files-storage-app.config';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import { FileRecordParentType, StorageLocation } from '../../../domain';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';
import { fileRecordEntityFactory } from '../../../testing';
import { CopyFileListResponse } from '../../dto';

jest.mock('../../../domain/utils/detect-mime-type.utils');

describe('files-storage controller (API) - Copy Timeout Tests', () => {
	let module: TestingModule;
	let app: INestApplication;
	let em: EntityManager;
	let testApiClient: TestApiClient;
	let requestTimeoutConfig: RequestTimeoutConfig;

	const baseRouteName = '/file';

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
			.overrideProvider(FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN)
			.useValue({
				coreIncomingRequestTimeoutMs: 5000,
				incomingRequestTimeoutCopyApiMs: 20,
			})
			.compile();

		app = module.createNestApplication();
		await app.init();

		testApiClient = new TestApiClient(app, baseRouteName);
		requestTimeoutConfig = module.get(FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN);
		em = module.get(EntityManager);
	});

	afterAll(async () => {
		await app.close();
		await module.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
		jest.restoreAllMocks();
	});

	describe('copy files timeout scenarios', () => {
		const setup = async () => {
			const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
			const loggedInClient = testApiClient.loginByUser(studentAccount, studentUser);
			const validId = new ObjectId().toHexString();
			const targetParentId = new ObjectId().toHexString();

			jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('application/octet-stream');

			// Create source files to copy
			const sourceFileRecords = fileRecordEntityFactory.buildList(10, {
				parentId: validId,
				parentType: FileRecordParentType.School,
				storageLocationId: validId,
				storageLocation: StorageLocation.SCHOOL,
			});

			await em.persistAndFlush(sourceFileRecords);
			em.clear();

			const copyFilesParams = {
				target: {
					storageLocation: StorageLocation.SCHOOL,
					storageLocationId: validId,
					parentId: targetParentId,
					parentType: FileRecordParentType.Course,
				},
			};

			return { validId, targetParentId, copyFilesParams, loggedInClient, user: studentUser };
		};

		describe('WHEN copy request exceeds server timeout', () => {
			it('should handle server timeout and return REQUEST_TIMEOUT status', async () => {
				requestTimeoutConfig.incomingRequestTimeoutCopyApiMs = 1;

				const { loggedInClient, validId, copyFilesParams } = await setup();

				const largeSourceFileRecords = fileRecordEntityFactory.buildList(100, {
					parentId: validId,
					parentType: FileRecordParentType.School,
					storageLocationId: validId,
					storageLocation: StorageLocation.SCHOOL,
				});

				await em.persistAndFlush(largeSourceFileRecords);
				em.clear();

				const response = await loggedInClient.post(`/copy/school/${validId}/schools/${validId}`, copyFilesParams);

				expect(response.status).toEqual(HttpStatus.REQUEST_TIMEOUT);
				expect(response.text).toContain('Request timed out');
			});
		});

		describe('WHEN copy request completes within timeout', () => {
			it('should successfully copy files within timeout limits', async () => {
				requestTimeoutConfig.incomingRequestTimeoutCopyApiMs = 10000;

				const { loggedInClient, validId, copyFilesParams } = await setup();

				const response = await loggedInClient
					.post(`/copy/school/${validId}/schools/${validId}`, copyFilesParams)
					.set('content-type', 'application/json');

				expect(response.status).toEqual(HttpStatus.CREATED);
				expect(response.body).toHaveProperty('data');
				const copyResponse = response.body as CopyFileListResponse;
				expect(Array.isArray(copyResponse.data)).toBe(true);
				expect(copyResponse.data.length).toBeGreaterThan(0);
			}, 10000);
		});
	});
});
