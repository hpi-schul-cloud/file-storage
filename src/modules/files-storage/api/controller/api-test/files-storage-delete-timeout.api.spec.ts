import { createMock, type DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { BatchOperationResultFactory, type S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import {
	FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN,
	type RequestTimeoutConfig,
} from '@modules/files-storage-app/files-storage-app.config';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing/files-storage.test.module';
import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { TestApiClient } from '@testing/test-api-client';
import NodeClam from 'clamscan';
import DetectMimeTypeUtils from '../../../domain/utils/detect-mime-type.utils';
import { FILES_STORAGE_S3_CONNECTION } from '../../../files-storage.config';

jest.mock('../../../domain/utils/detect-mime-type.utils');

describe('files-storage controller (API) - Delete Timeout Tests', () => {
	let module: TestingModule;
	let app: INestApplication;
	let requestTimeoutConfig: RequestTimeoutConfig;
	let storageClient: DeepMocked<S3ClientAdapter>;

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
				incomingRequestTimeoutCopyApiMs: 5000,
				incomingRequestTimeoutDeleteApiMs: 20,
			})
			.compile();

		app = module.createNestApplication();
		await app.init();

		requestTimeoutConfig = module.get(FILES_STORAGE_APP_REQUEST_TIMEOUT_CONFIG_TOKEN);
		storageClient = module.get(FILES_STORAGE_S3_CONNECTION);
	});

	afterAll(async () => {
		await app.close();
		await module.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
		jest.restoreAllMocks();
	});

	describe('delete file timeout scenarios', () => {
		const setup = async () => {
			const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName);
			const validId = new ObjectId().toHexString();

			jest.spyOn(DetectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValue('text/plain');

			const uploadResponse = await loggedInClient
				.post(`/upload/school/${validId}/schools/${validId}`)
				.attach('file', Buffer.from('abcd'), 'timeout-test.txt')
				.set('connection', 'keep-alive')
				.set('content-type', 'multipart/form-data; boundary=----WebKitFormBoundaryiBMuOC0HyZ3YnA20');

			return {
				loggedInClient,
				fileRecordId: uploadResponse.body.id as string,
			};
		};

		describe('WHEN delete request exceeds server timeout', () => {
			it('should return REQUEST_TIMEOUT status', async () => {
				requestTimeoutConfig.incomingRequestTimeoutDeleteApiMs = 1;

				storageClient.moveToTrash.mockImplementation(
					() =>
						new Promise((resolve) => {
							setTimeout(() => resolve(BatchOperationResultFactory.empty()), 100);
						})
				);

				const { loggedInClient, fileRecordId } = await setup();
				const response = await loggedInClient.delete(`/delete/${fileRecordId}`).timeout(2000);

				expect(response.status).toEqual(HttpStatus.REQUEST_TIMEOUT);
				expect(response.text).toContain('Request timed out');
			});
		});

		describe('WHEN delete request completes within timeout', () => {
			it('should return 200 status', async () => {
				requestTimeoutConfig.incomingRequestTimeoutDeleteApiMs = 5000;
				storageClient.moveToTrash.mockResolvedValue(BatchOperationResultFactory.empty());

				const { loggedInClient, fileRecordId } = await setup();
				const response = await loggedInClient.delete(`/delete/${fileRecordId}`);

				expect(response.status).toEqual(HttpStatus.OK);
			});
		});
	});
});
