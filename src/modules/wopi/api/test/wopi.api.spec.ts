import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import {
	accessTokenPayloadResponseTestFactory,
	accessTokenResponseTestFactory,
} from '@infra/authorization-client/testing';
import { CollaboraService } from '@infra/collabora';
import { S3ClientAdapter } from '@infra/s3-client';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from '@modules/files-storage';
import { FilesStorageTestModule } from '@modules/files-storage-app/testing';
import { ScanStatus } from '@modules/files-storage/domain';
import { FileRecordEntity } from '@modules/files-storage/repo';
import {
	fileRecordEntityFactory,
	fileRecordSecurityCheckEmbeddableFactory,
	GetFileResponseTestFactory,
} from '@modules/files-storage/testing';
import { ForbiddenException, INestApplication, InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import mock from 'mock-fs';
import fs from 'node:fs';
import path from 'node:path';
import StreamUtils from '../../../files-storage/domain/service/stream.utils';
import {
	authorizedCollaboraDocumentUrlParamsTestFactory,
	wopiAccessTokenParamsTestFactory,
	wopiPayloadTestFactory,
} from '../../testing';
import { WopiConfig } from '../../wopi.config';
import { EditorMode, WopiFileInfoResponse } from '../dto';

jest.mock('../../../files-storage/domain/service/stream.utils');

describe('Wopi Controller (API)', () => {
	let app: INestApplication;
	let testApiClient: TestApiClient;
	let authorizationClientAdapter: DeepMocked<AuthorizationClientAdapter>;
	let collaboraService: DeepMocked<CollaboraService>;
	let storageClient: DeepMocked<S3ClientAdapter>;
	let wopiConfig: DeepMocked<WopiConfig>;
	let filesStorageConfig: DeepMocked<FileStorageConfig>;
	let em: EntityManager;
	const collaboraMaxFileSizeInBytes = 104857600;

	beforeAll(async () => {
		const moduleFixture = await Test.createTestingModule({
			imports: [FilesStorageTestModule],
		})
			.overrideProvider(AuthorizationClientAdapter)
			.useValue(createMock<AuthorizationClientAdapter>())
			.overrideProvider(CollaboraService)
			.useValue(createMock<CollaboraService>())
			.overrideProvider(FILES_STORAGE_S3_CONNECTION)
			.useValue(createMock<S3ClientAdapter>())
			.overrideProvider(WopiConfig)
			.useValue({
				FEATURE_COLUMN_BOARD_COLLABORA_ENABLED: false,
				COLLABORA_MAX_FILE_SIZE_IN_BYTES: collaboraMaxFileSizeInBytes,
			})
			.overrideProvider(FileStorageConfig)
			.useValue({})
			.compile();

		app = moduleFixture.createNestApplication();
		await app.init();

		authorizationClientAdapter = moduleFixture.get(AuthorizationClientAdapter);
		em = moduleFixture.get(EntityManager);
		collaboraService = moduleFixture.get(CollaboraService);
		storageClient = moduleFixture.get(FILES_STORAGE_S3_CONNECTION);
		wopiConfig = moduleFixture.get(WopiConfig);
		filesStorageConfig = moduleFixture.get(FileStorageConfig);

		testApiClient = new TestApiClient(app, '/wopi');
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
		wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = false;
	});

	describe('getAuthorizedCollaboraDocumentUrl', () => {
		describe('when editorMode is write', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const query = authorizedCollaboraDocumentUrlParamsTestFactory()
					.withFileRecordId(fileRecord.id)
					.withEditorMode(EditorMode.EDIT)
					.build();
				const token = accessTokenResponseTestFactory().build();
				const collaboraUrl = 'http://collabora.url';

				em.persistAndFlush(fileRecord);

				collaboraService.discoverUrl.mockResolvedValueOnce(collaboraUrl);
				authorizationClientAdapter.createToken.mockResolvedValueOnce(token);
				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;
				wopiConfig.WOPI_URL = 'http://localhost:4444/api/v3/wopi/files';

				return { query, loggedInClient, token, collaboraUrl };
			};

			it('should return 200 and valid access url', async () => {
				const { query, loggedInClient, token, collaboraUrl } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				const expectedWopiSrc = encodeURIComponent(`http://localhost:4444/api/v3/wopi/files/${query.fileRecordId}`);
				const expectedUrl = `${collaboraUrl}/?WOPISrc=${expectedWopiSrc}&access_token=${token.token}`;
				expect(response.status).toBe(200);
				expect(response.body).toEqual({
					authorizedCollaboraDocumentUrl: expectedUrl,
				});
			});
		});

		describe('when editorMode is VIEW', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const query = authorizedCollaboraDocumentUrlParamsTestFactory()
					.withFileRecordId(fileRecord.id)
					.withEditorMode(EditorMode.VIEW)
					.build();
				const token = accessTokenResponseTestFactory().build();
				const collaboraUrl = 'http://collabora.url';

				em.persistAndFlush(fileRecord);

				collaboraService.discoverUrl.mockResolvedValueOnce(collaboraUrl);
				authorizationClientAdapter.createToken.mockResolvedValueOnce(token);
				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { query, loggedInClient, token, collaboraUrl };
			};

			it('should return 200 and valid access url', async () => {
				const { query, loggedInClient, token, collaboraUrl } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				const expectedWopiSrc = encodeURIComponent(`http://localhost:4444/api/v3/wopi/files/${query.fileRecordId}`);
				const expectedUrl = `${collaboraUrl}/?WOPISrc=${expectedWopiSrc}&access_token=${token.token}`;
				expect(response.status).toBe(200);
				expect(response.body).toEqual({
					authorizedCollaboraDocumentUrl: expectedUrl,
				});
			});
		});

		describe('when filerecord is blocked', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				fileRecord.securityCheck = fileRecordSecurityCheckEmbeddableFactory.build({ status: ScanStatus.BLOCKED });
				const query = authorizedCollaboraDocumentUrlParamsTestFactory()
					.withFileRecordId(fileRecord.id)
					.withEditorMode(EditorMode.EDIT)
					.build();
				const token = accessTokenResponseTestFactory().build();
				const collaboraUrl = 'http://collabora.url';

				em.persistAndFlush(fileRecord);

				collaboraService.discoverUrl.mockResolvedValueOnce(collaboraUrl);
				authorizationClientAdapter.createToken.mockResolvedValueOnce(token);
				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { query, loggedInClient };
			};

			it('should return 404', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when filerecord has mimetype not compatible with collabora', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.asPdf().buildWithId();
				const query = authorizedCollaboraDocumentUrlParamsTestFactory()
					.withFileRecordId(fileRecord.id)
					.withEditorMode(EditorMode.EDIT)
					.build();
				const token = accessTokenResponseTestFactory().build();
				const collaboraUrl = 'http://collabora.url';

				em.persistAndFlush(fileRecord);

				collaboraService.discoverUrl.mockResolvedValueOnce(collaboraUrl);
				authorizationClientAdapter.createToken.mockResolvedValueOnce(token);
				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { query, loggedInClient };
			};

			it('should return 404', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when filerecord has size exceeding the collabora limit', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const size = collaboraMaxFileSizeInBytes + 1;
				const fileRecord = fileRecordEntityFactory.asOpenDocument().setSize(size).buildWithId();
				const query = authorizedCollaboraDocumentUrlParamsTestFactory()
					.withFileRecordId(fileRecord.id)
					.withEditorMode(EditorMode.EDIT)
					.build();
				const token = accessTokenResponseTestFactory().build();
				const collaboraUrl = 'http://collabora.url';

				em.persistAndFlush(fileRecord);

				collaboraService.discoverUrl.mockResolvedValueOnce(collaboraUrl);
				authorizationClientAdapter.createToken.mockResolvedValueOnce(token);
				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { query, loggedInClient };
			};

			it('should return 404', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when WOPI feature is disabled', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const query = authorizedCollaboraDocumentUrlParamsTestFactory().build();

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = false;

				return { query, loggedInClient };
			};

			it('should return 404 NotFound because route is disabled', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(404);
				expect(response.body.message).toBe('WOPI feature is disabled.');
			});
		});

		describe('when user is not logged in', () => {
			it('should return 401 Unauthorized', async () => {
				const query = authorizedCollaboraDocumentUrlParamsTestFactory().build();

				const response = await testApiClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(401);
			});
		});

		describe('when user is not authorized', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const query = authorizedCollaboraDocumentUrlParamsTestFactory().withFileRecordId(fileRecord.id).build();
				const collaboraUrl = 'http://collabora.url';
				const forbiddenException = new ForbiddenException('User is not authorized');

				em.persistAndFlush(fileRecord);

				collaboraService.discoverUrl.mockResolvedValueOnce(collaboraUrl);
				authorizationClientAdapter.createToken.mockRejectedValueOnce(forbiddenException);
				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { query, loggedInClient };
			};

			it('should return 403 Forbidden because user is not authorized', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(403);
			});
		});

		describe('when Collabora service fails to get discovery URL', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const query = authorizedCollaboraDocumentUrlParamsTestFactory().withFileRecordId(fileRecord.id).build();
				const collaboraException = new Error('Collabora service error');
				const token = accessTokenResponseTestFactory().build();

				em.persistAndFlush(fileRecord);

				authorizationClientAdapter.createToken.mockResolvedValueOnce(token);
				collaboraService.discoverUrl.mockRejectedValueOnce(collaboraException);
				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { query, loggedInClient };
			};

			it('should return 500 Internal Server Error', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(500);
			});
		});

		describe('when fileRecordId is not valid', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const query = authorizedCollaboraDocumentUrlParamsTestFactory().withFileRecordId('').build();

				return { query, loggedInClient };
			};

			it('should return 400 Bad Request', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(400);
			});
		});

		describe('when editorMode is not valid', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const query = authorizedCollaboraDocumentUrlParamsTestFactory()
					.withEditorMode('invalid-mode' as EditorMode)
					.build();

				return { query, loggedInClient };
			};

			it('should return 400 Bad Request', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(400);
			});
		});

		describe('when userDisplayName is undefined', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const query = authorizedCollaboraDocumentUrlParamsTestFactory()
					.withUserDisplayName(undefined as unknown as string)
					.build();

				return { query, loggedInClient };
			};

			it('should return 400 Bad Request', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(400);
			});
		});

		describe('when userDisplayName is more than 100 characters', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const query = authorizedCollaboraDocumentUrlParamsTestFactory().withUserDisplayName('a'.repeat(101)).build();

				return { query, loggedInClient };
			};

			it('should return 400 Bad Request', async () => {
				const { query, loggedInClient } = await setup();

				const response = await loggedInClient.get('/authorized-collabora-document-url').query(query);

				expect(response.status).toBe(400);
			});
		});
	});

	describe('checkFileInfo', () => {
		describe('when request is successful', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);
				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;
				wopiConfig.WOPI_POST_MESSAGE_ORIGIN = 'http://localhost:4000';

				const expectedResult = {
					BaseFileName: fileRecord.name,
					Size: fileRecord.size,
					OwnerId: fileRecord.creatorId,
					UserId: wopiPayload.userId,
					UserCanWrite: wopiPayload.canWrite,
					UserFriendlyName: wopiPayload.userDisplayName,
					IsAdminUser: false,
					LastModifiedTime: fileRecord.contentLastModifiedAt?.toISOString(),
					PostMessageOrigin: 'http://localhost:4000',
				};

				return { fileRecord, query, wopiPayload, expectedResult };
			};

			it('should return 200 and valid file info', async () => {
				const { fileRecord, query, expectedResult } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				const result = response.body as WopiFileInfoResponse;

				expect(response.status).toBe(200);
				expect(result).toEqual(expectedResult);
			});
		});

		describe('when filerecord is blocked', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				fileRecord.securityCheck = fileRecordSecurityCheckEmbeddableFactory.build({ status: ScanStatus.BLOCKED });
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query };
			};

			it('should return 404', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when filerecord has mimetype not compatible with collabora', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asPdf().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query };
			};

			it('should return 404', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when filerecord has size exceeding the collabora limit', () => {
			const setup = async () => {
				const size = collaboraMaxFileSizeInBytes + 1;
				const fileRecord = fileRecordEntityFactory.asOpenDocument().setSize(size).buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query };
			};

			it('should return 404', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when WOPI feature is disabled', () => {
			const setup = () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const query = wopiAccessTokenParamsTestFactory().build();

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = false;

				return { fileRecord, query };
			};

			it('should return 404 Notfound because route is disabled', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(404);
				expect(response.body.message).toBe('WOPI feature is disabled.');
			});
		});

		describe('when authorizationClientAdapter rejects with forbidden error', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const query = wopiAccessTokenParamsTestFactory().build();
				const error = new ForbiddenException('Token resolution error');

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockRejectedValueOnce(error);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query };
			};

			it('should return 401 Unauthorized', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(401);
			});
		});

		describe('when authorizationClientAdapter rejects with internal server exception', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const query = wopiAccessTokenParamsTestFactory().build();
				const error = new InternalServerErrorException('Token resolution error');

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockRejectedValueOnce(error);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query };
			};

			it('should return 500 Internal Server Error', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(500);
			});
		});

		describe('when fileRecord is not in db', () => {
			const setup = () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, wopiPayload };
			};

			it('should return 404 not found', async () => {
				const { fileRecord, query } = setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when fileRecordId is not valid', () => {
			const setup = () => {
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();

				return { query };
			};

			it('should return 400 Bad Request', async () => {
				const { query } = setup();

				const response = await testApiClient.get(`/files/invalid-id`).query(query);

				expect(response.status).toBe(400);
			});
		});

		describe('when access token is not provided', () => {
			it('should return 400 Bad Request', async () => {
				const fileRecordId = new ObjectId().toHexString();

				const response = await testApiClient.get(`/files/${fileRecordId}`);

				expect(response.status).toBe(400);
			});
		});

		describe('when access token is malformed', () => {
			const setup = () => {
				const fileRecordId = new ObjectId().toHexString();
				const query = wopiAccessTokenParamsTestFactory().withAccessToken('invalid-token').build();

				return { query, fileRecordId };
			};

			it('should return 400 Bad Request', async () => {
				const { query, fileRecordId } = setup();

				const response = await testApiClient.get(`/files/${fileRecordId}`).query(query);

				expect(response.status).toBe(400);
			});
		});
	});

	describe('getFile', () => {
		describe('when request is successful', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				const contentForReadable = 'contentForReadable';
				const fileResponse = GetFileResponseTestFactory.build({ contentForReadable });
				storageClient.get.mockResolvedValueOnce(fileResponse);

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, fileResponse, contentForReadable };
			};

			it('should return 200 and file contents as stream', async () => {
				const { fileRecord, query, contentForReadable } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}/contents`).query(query);

				expect(response.status).toBe(200);
				expect(response.body).toBeInstanceOf(Buffer);
				expect(response.body.toString()).toBe(contentForReadable);
			});
		});

		describe('when filerecord is blocked', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				fileRecord.securityCheck = fileRecordSecurityCheckEmbeddableFactory.build({ status: ScanStatus.BLOCKED });
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				const contentForReadable = 'contentForReadable';
				const fileResponse = GetFileResponseTestFactory.build({ contentForReadable });
				storageClient.get.mockResolvedValueOnce(fileResponse);

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, fileResponse };
			};

			it('should return 404', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}/contents`).query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when filerecord has mimetype not compatible with collabora', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asPdf().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				const contentForReadable = 'contentForReadable';
				const fileResponse = GetFileResponseTestFactory.build({ contentForReadable });
				storageClient.get.mockResolvedValueOnce(fileResponse);

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, fileResponse };
			};

			it('should return 404', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}/contents`).query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when filerecord has size exceeding the collabora limit', () => {
			const setup = async () => {
				const size = collaboraMaxFileSizeInBytes + 1;
				const fileRecord = fileRecordEntityFactory.asOpenDocument().setSize(size).buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				const contentForReadable = 'contentForReadable';
				const fileResponse = GetFileResponseTestFactory.build({ contentForReadable });
				storageClient.get.mockResolvedValueOnce(fileResponse);

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, fileResponse };
			};

			it('should return 404', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}/contents`).query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when WOPI feature is disabled', () => {
			const setup = () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = false;

				return { fileRecord, query };
			};

			it('should return 404 Notfound because route is disabled', async () => {
				const { fileRecord, query } = setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}/contents`).query(query);

				expect(response.status).toBe(404);
				expect(response.body.message).toBe('WOPI feature is disabled.');
			});
		});

		describe('when authorizationClientAdapter rejects', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();

				const forbiddenException = new ForbiddenException('Token resolution error');
				authorizationClientAdapter.resolveToken.mockRejectedValueOnce(forbiddenException);

				const contentForReadable = 'contentForReadable';
				const fileResponse = GetFileResponseTestFactory.build({ contentForReadable });
				storageClient.get.mockResolvedValueOnce(fileResponse);

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, fileResponse, contentForReadable };
			};

			it('should return 401 Unauthorizrd', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}/contents`).query(query);

				expect(response.status).toBe(401);
			});
		});

		describe('when fileRecord is not in db', () => {
			const setup = () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				const contentForReadable = 'contentForReadable';
				const fileResponse = GetFileResponseTestFactory.build({ contentForReadable });
				storageClient.get.mockResolvedValueOnce(fileResponse);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, fileResponse, contentForReadable };
			};

			it('should return 404 not found', async () => {
				const { fileRecord, query } = setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}/contents`).query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when storage client rejects', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				const error = new Error('Storage client error');
				storageClient.get.mockRejectedValueOnce(error);

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, error };
			};

			it('should return 500 Internal Server Error', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}/contents`).query(query);

				expect(response.status).toBe(500);
			});
		});

		describe('when fileRecordId is not valid', () => {
			const setup = () => {
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();

				return { query };
			};

			it('should return 400 Bad Request', async () => {
				const { query } = setup();

				const response = await testApiClient.get(`/files/invalid-id/contents`).query(query);

				expect(response.status).toBe(400);
			});
		});

		describe('when access token is not provided', () => {
			it('should return 400 Bad Request', async () => {
				const fileRecordId = new ObjectId().toHexString();

				const response = await testApiClient.get(`/files/${fileRecordId}/contents`);

				expect(response.status).toBe(400);
			});
		});

		describe('when access token is malformed', () => {
			it('should return 400 Bad Request', async () => {
				const fileRecordId = new ObjectId().toHexString();
				const query = wopiAccessTokenParamsTestFactory().withAccessToken('invalid-token').build();

				const response = await testApiClient.get(`/files/${fileRecordId}/contents`).query(query);

				expect(response.status).toBe(400);
			});
		});
	});

	describe('putFile', () => {
		describe('when file is uploaded successfully', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const initialContentLastModifiedAt = fileRecord.contentLastModifiedAt
					? new Date(fileRecord.contentLastModifiedAt)
					: undefined;
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);
				jest.spyOn(StreamUtils, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));
				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, initialContentLastModifiedAt };
			};

			it('should return 200 and updated file record', async () => {
				const { fileRecord, query, initialContentLastModifiedAt } = await setup();

				const response = await testApiClient
					.post(`/files/${fileRecord.id}/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				const updatedFileRecord = await em.findOne(FileRecordEntity, fileRecord.id);

				expect(response.status).toBe(200);
				expect(response.body.LastModifiedTime).not.toBe(initialContentLastModifiedAt?.toISOString());
				expect(response.body.LastModifiedTime).toBe(updatedFileRecord?.contentLastModifiedAt?.toISOString());
			});
		});

		describe('when mime type does not match old mime type', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asPdf().buildWithId();
				const initialContentLastModifiedAt = fileRecord.contentLastModifiedAt
					? new Date(fileRecord.contentLastModifiedAt)
					: undefined;
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				jest.spyOn(StreamUtils, 'fileTypeStream').mockImplementation((readable) => {
					const redableStreamWithFileType = Object.assign(readable, {
						fileType: { mime: 'text/plain', ext: 'txt' },
					});

					return Promise.resolve(redableStreamWithFileType);
				});

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, initialContentLastModifiedAt };
			};

			it('should return 500 internal error becaus 409 in wopi as other use case', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient
					.post(`/files/${fileRecord.id}/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(500);
			});
		});

		describe('when WOPI feature is disabled', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				jest.spyOn(StreamUtils, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = false;

				return { fileRecord, query };
			};

			it('should return 404 Notfound because route is disabled', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient
					.post(`/files/${fileRecord.id}/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(404);
				expect(response.body.message).toBe('WOPI feature is disabled.');
			});
		});

		describe('when authorizationClientAdapter rejects with forbidden error', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();

				const error = new ForbiddenException('Token resolution error');
				authorizationClientAdapter.resolveToken.mockRejectedValueOnce(error);

				jest.spyOn(StreamUtils, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query };
			};

			it('should return 401 Unauthorized', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient
					.post(`/files/${fileRecord.id}/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(401);
			});
		});

		describe('when file is to big', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const initialContentLastModifiedAt = fileRecord.contentLastModifiedAt
					? new Date(fileRecord.contentLastModifiedAt)
					: undefined;
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				jest.spyOn(StreamUtils, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;
				filesStorageConfig.FILES_STORAGE_MAX_FILE_SIZE = 0; // Set a small max file size for testing

				return { fileRecord, query, initialContentLastModifiedAt };
			};

			it('should return 200 and updated file record', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient
					.post(`/files/${fileRecord.id}/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(413);
			});
		});

		describe('when authorizationClientAdapter rejects with error that should not be mapped', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();

				const error = new InternalServerErrorException('Token resolution error');
				authorizationClientAdapter.resolveToken.mockRejectedValueOnce(error);

				jest.spyOn(StreamUtils, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query };
			};

			it('should pass original error ', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient
					.post(`/files/${fileRecord.id}/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(500);
			});
		});

		describe('when fileRecord is not in db', () => {
			const setup = () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				jest.spyOn(StreamUtils, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query };
			};

			it('should return 404 not found', async () => {
				const { fileRecord, query } = setup();

				const response = await testApiClient
					.post(`/files/${fileRecord.id}/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(404);
			});
		});

		describe('when storage client rejects', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				const error = new Error('Storage client error');
				storageClient.create.mockRejectedValueOnce(error);

				jest.spyOn(StreamUtils, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));

				await em.persistAndFlush(fileRecord);

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, error };
			};

			it('should return 500 Internal Server Error', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient
					.post(`/files/${fileRecord.id}/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(500);
			});
		});

		describe('when fileRecordId is not valid', () => {
			const setup = () => {
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();

				return { query };
			};

			it('should return 400 Bad Request', async () => {
				const { query } = setup();

				const response = await testApiClient
					.post(`/files/invalid-id/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(400);
			});
		});

		describe('when access token is not provided', () => {
			it('should return 400 Bad Request', async () => {
				const fileRecordId = new ObjectId().toHexString();

				const response = await testApiClient
					.post(`/files/${fileRecordId}/contents`)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(400);
			});
		});

		describe('when access token is malformed', () => {
			it('should return 400 Bad Request', async () => {
				const fileRecordId = new ObjectId().toHexString();
				const query = wopiAccessTokenParamsTestFactory().withAccessToken('invalid-token').build();

				const response = await testApiClient
					.post(`/files/${fileRecordId}/contents`)
					.query(query)
					.attach('file', Buffer.from('abcd'), 'test.txt');

				expect(response.status).toBe(400);
			});
		});

		describe('when error is emitted on stream', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.asOpenDocument().buildWithId();
				const initialContentLastModifiedAt = fileRecord.contentLastModifiedAt
					? new Date(fileRecord.contentLastModifiedAt)
					: undefined;
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory().withFileRecordId(fileRecord.id).withCanWrite(true).build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				jest.spyOn(StreamUtils, 'fileTypeStream').mockImplementation((readable) => Promise.resolve(readable));

				await em.persistAndFlush(fileRecord);

				mock({
					'./mocked-file.txt': 'test content for the mock',
				});
				const filePath = path.join(__dirname, './mocked-file.txt');
				const stream = fs.createReadStream(filePath);
				stream.on('data', () => {
					stream.emit('error', new Error('Stream error'));
				});

				wopiConfig.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED = true;

				return { fileRecord, query, initialContentLastModifiedAt, stream };
			};

			it('should not update filerecord', async () => {
				const { fileRecord, query, initialContentLastModifiedAt, stream } = await setup();

				try {
					await testApiClient.post(`/files/${fileRecord.id}/contents`).query(query).attach('file', stream, 'test.txt');
				} catch (error) {
					expect(error.message).toBe('Aborted');
				}

				const updatedFileRecord = await em.findOne(FileRecordEntity, fileRecord.id);

				expect(updatedFileRecord?.contentLastModifiedAt).toEqual(initialContentLastModifiedAt);
				mock.restore();
			});
		});
	});
});
