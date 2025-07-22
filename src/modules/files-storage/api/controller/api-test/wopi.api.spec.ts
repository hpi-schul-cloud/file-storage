import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { accessTokenResponseTestFactory } from '@infra/authorization-client/testing';
import { accessTokenPayloadResponseTestFactory } from '@infra/authorization-client/testing/access-token-payload-response.test.factory';
import { CollaboraService } from '@infra/collabora';
import { S3ClientAdapter } from '@infra/s3-client';
import { EntityManager, ObjectId } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage/files-storage-test.module';
import { FILES_STORAGE_S3_CONNECTION } from '@modules/files-storage/files-storage.config';
import { fileRecordEntityFactory, GetFileResponseTestFactory } from '@modules/files-storage/testing';
import { wopiAccessTokenParamsTestFactory } from '@modules/files-storage/testing/wopi/wopi-access-token-params.test.factory';
import { ForbiddenException, INestApplication, InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import { discoveryAccessUrlParamsTestFactory, wopiPayloadTestFactory } from '../../../testing/wopi';
import { EditorMode, WopiCheckFileInfoResponse } from '../../dto';

describe('Wopi Controller (API)', () => {
	let app: INestApplication;
	let testApiClient: TestApiClient;
	let authorizationClientAdapter: DeepMocked<AuthorizationClientAdapter>;
	let collaboraService: DeepMocked<CollaboraService>;
	let storageClient: DeepMocked<S3ClientAdapter>;
	let em: EntityManager;

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
			.compile();

		app = moduleFixture.createNestApplication();
		await app.init();

		authorizationClientAdapter = moduleFixture.get(AuthorizationClientAdapter);
		em = moduleFixture.get(EntityManager);
		collaboraService = moduleFixture.get(CollaboraService);
		storageClient = moduleFixture.get(FILES_STORAGE_S3_CONNECTION);

		testApiClient = new TestApiClient(app, '/wopi');
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('getAuthorizedCollaboraAccessUrl', () => {
		describe('when request is successful', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.buildWithId();
				const body = discoveryAccessUrlParamsTestFactory().withFileRecordId(fileRecord.id).build();
				const token = accessTokenResponseTestFactory().build();
				const collaboraUrl = 'http://collabora.url';

				em.persistAndFlush(fileRecord);

				collaboraService.discoverUrl.mockResolvedValueOnce(collaboraUrl);
				authorizationClientAdapter.createToken.mockResolvedValueOnce(token);

				return { body, loggedInClient, token, collaboraUrl };
			};

			it('should return 201 and valid access url', async () => {
				const { body, loggedInClient, token, collaboraUrl } = await setup();

				const response = await loggedInClient.post('/authorized-collabora-access-url').send(body);

				const expectedWopiSrc = encodeURIComponent(`http://localhost:4444/api/v3/wopi/files/${body.fileRecordId}`);
				const expectedUrl = `${collaboraUrl}/?WOPISrc=${expectedWopiSrc}&access_token=${token.token}`;
				expect(response.status).toBe(201);
				expect(response.body).toEqual({
					onlineUrl: expectedUrl,
				});
			});
		});

		describe('when user is not logged in', () => {
			const setup = () => {
				const body = discoveryAccessUrlParamsTestFactory().build();

				return { body };
			};

			it('should return 401 Unauthorized', async () => {
				const { body } = setup();

				const response = await testApiClient.post('/authorized-collabora-access-url').send(body);

				expect(response.status).toBe(401);
			});
		});

		describe('when user is not authorized', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.buildWithId();
				const body = discoveryAccessUrlParamsTestFactory().withFileRecordId(fileRecord.id).build();
				const collaboraUrl = 'http://collabora.url';
				const forbiddenException = new ForbiddenException('User is not authorized');

				em.persistAndFlush(fileRecord);

				collaboraService.discoverUrl.mockResolvedValueOnce(collaboraUrl);
				authorizationClientAdapter.createToken.mockRejectedValueOnce(forbiddenException);

				return { body, loggedInClient };
			};

			it('should return 403 Forbidden', async () => {
				const { body, loggedInClient } = await setup();

				const response = await loggedInClient.post('/authorized-collabora-access-url').send(body);

				expect(response.status).toBe(403);
			});
		});

		describe('when Collabora service fails to get discovery URL', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.buildWithId();
				const body = discoveryAccessUrlParamsTestFactory().withFileRecordId(fileRecord.id).build();
				const collaboraException = new Error('Collabora service error');
				const token = accessTokenResponseTestFactory().build();

				em.persistAndFlush(fileRecord);

				authorizationClientAdapter.createToken.mockResolvedValueOnce(token);
				collaboraService.discoverUrl.mockRejectedValueOnce(collaboraException);

				return { body, loggedInClient };
			};

			it('should return 500 Internal Server Error', async () => {
				const { body, loggedInClient } = await setup();

				const response = await loggedInClient.post('/authorized-collabora-access-url').send(body);

				expect(response.status).toBe(500);
			});
		});

		describe('when fileRecordId is not valid', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const body = discoveryAccessUrlParamsTestFactory().withFileRecordId('').build();

				return { body, loggedInClient };
			};

			it('should return 400 Bad Request', async () => {
				const { body, loggedInClient } = await setup();

				const response = await loggedInClient.post('/authorized-collabora-access-url').send(body);

				expect(response.status).toBe(400);
			});
		});

		describe('when editorMode is not valid', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const body = discoveryAccessUrlParamsTestFactory()
					.withEditorMode('invalid-mode' as EditorMode)
					.build();

				return { body, loggedInClient };
			};

			it('should return 400 Bad Request', async () => {
				const { body, loggedInClient } = await setup();

				const response = await loggedInClient.post('/authorized-collabora-access-url').send(body);

				expect(response.status).toBe(400);
			});
		});

		describe('when userDisplayName is undefined', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const body = discoveryAccessUrlParamsTestFactory()
					.withUserDisplayName(undefined as unknown as string)
					.build();

				return { body, loggedInClient };
			};

			it('should return 400 Bad Request', async () => {
				const { body, loggedInClient } = await setup();

				const response = await loggedInClient.post('/authorized-collabora-access-url').send(body);

				expect(response.status).toBe(400);
			});
		});

		describe('when userDisplayName is more than 100 characters', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const body = discoveryAccessUrlParamsTestFactory().withUserDisplayName('a'.repeat(101)).build();

				return { body, loggedInClient };
			};

			it('should return 400 Bad Request', async () => {
				const { body, loggedInClient } = await setup();

				const response = await loggedInClient.post('/authorized-collabora-access-url').send(body);

				expect(response.status).toBe(400);
			});
		});
	});

	describe('checkFileInfo', () => {
		describe('when request is successful', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory()
					.withFileRecordId(fileRecord.id)
					.withUserId(studentUser.id)
					.withCanWrite(true)
					.build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				return { fileRecord, loggedInClient, query, studentUser, studentAccount, wopiPayload };
			};

			it('should return 200 and valid file info', async () => {
				const { fileRecord, loggedInClient, query, studentUser, wopiPayload } = await setup();

				const response = await loggedInClient.get(`/files/${fileRecord.id}`).query(query);

				const result = response.body as WopiCheckFileInfoResponse;

				expect(response.status).toBe(200);
				expect(result.BaseFileName).toBe(fileRecord.name);
				expect(result.Size).toBe(fileRecord.size);
				expect(result.OwnerID).toBe(fileRecord.creatorId);
				expect(result.UserId).toBe(studentUser.id);
				expect(result.UserCanWrite).toBe(wopiPayload.canWrite);
				expect(result.UserFriendlyName).toBe(wopiPayload.userDisplayName);
			});
		});

		describe('when authorizationClientAdapter rejects with forbidden error', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.buildWithId();
				const query = wopiAccessTokenParamsTestFactory().build();
				const error = new ForbiddenException('Token resolution error');

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockRejectedValueOnce(error);

				return { fileRecord, query };
			};

			it('should return 403 Forbidden', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(403);
			});
		});

		describe('when authorizationClientAdapter rejects with internal server exception', () => {
			const setup = async () => {
				const fileRecord = fileRecordEntityFactory.buildWithId();
				const query = wopiAccessTokenParamsTestFactory().build();
				const error = new InternalServerErrorException('Token resolution error');

				await em.persistAndFlush(fileRecord);

				authorizationClientAdapter.resolveToken.mockRejectedValueOnce(error);

				return { fileRecord, query };
			};

			it('should return 500 Internal Server Error', async () => {
				const { fileRecord, query } = await setup();

				const response = await testApiClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(500);
			});
		});

		describe('when fileRecord is not in db', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory()
					.withFileRecordId(fileRecord.id)
					.withUserId(studentUser.id)
					.withCanWrite(true)
					.build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				return { fileRecord, loggedInClient, query, studentUser, studentAccount, wopiPayload };
			};

			it('should return 404 not found', async () => {
				const { loggedInClient, fileRecord, query } = await setup();

				const response = await loggedInClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(404);
			});
		});

		describe('when fileRecordId is not valid', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();

				return { loggedInClient, query };
			};

			it('should return 400 Bad Request', async () => {
				const { loggedInClient, query } = await setup();

				const response = await loggedInClient.get(`/files/invalid-id`).query(query);

				expect(response.status).toBe(400);
			});
		});

		describe('when access token is not provided', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				return { loggedInClient };
			};

			it('should return 400 Bad Request', async () => {
				const { loggedInClient } = await setup();

				const response = await loggedInClient.get(`/files/some-file-id`);

				expect(response.status).toBe(400);
			});
		});

		describe('when access token is malformed', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecordId = new ObjectId().toHexString();
				const query = wopiAccessTokenParamsTestFactory().withAccessToken('invalid-token').build();

				return { loggedInClient, query, fileRecordId };
			};

			it('should return 400 Bad Request', async () => {
				const { loggedInClient, query, fileRecordId } = await setup();

				const response = await loggedInClient.get(`/files/${fileRecordId}`).query(query);

				expect(response.status).toBe(400);
			});
		});
	});

	describe('getFile', () => {
		describe('when request is successful', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();
				const wopiPayload = wopiPayloadTestFactory()
					.withFileRecordId(fileRecord.id)
					.withUserId(studentUser.id)
					.withCanWrite(true)
					.build();
				const accessTokenPayloadResponse = accessTokenPayloadResponseTestFactory().withPayload(wopiPayload).build();

				authorizationClientAdapter.resolveToken.mockResolvedValueOnce(accessTokenPayloadResponse);

				const contentForReadable = 'contentForReadable';
				const fileResponse = GetFileResponseTestFactory.build({ contentForReadable });
				storageClient.get.mockResolvedValueOnce(fileResponse);

				await em.persistAndFlush(fileRecord);

				return { fileRecord, loggedInClient, query, fileResponse, contentForReadable };
			};

			it('should return 200 and file contents as stream', async () => {
				const { fileRecord, loggedInClient, query, contentForReadable } = await setup();

				const response = await loggedInClient.get(`/files/${fileRecord.id}/contents`).query(query);

				expect(response.status).toBe(200);
				expect(response.body).toBeInstanceOf(Buffer);
				expect(response.body.toString()).toBe(contentForReadable);
			});
		});

		describe('when authorizationClientAdapter rejects', () => {
			const setup = async () => {
				const { studentUser, studentAccount } = UserAndAccountTestFactory.buildStudent();
				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				const fileRecord = fileRecordEntityFactory.buildWithId();
				const accessToken = accessTokenResponseTestFactory().build().token;
				const query = wopiAccessTokenParamsTestFactory().withAccessToken(accessToken).build();

				const forbiddenException = new ForbiddenException('Token resolution error');
				authorizationClientAdapter.resolveToken.mockRejectedValueOnce(forbiddenException);

				const contentForReadable = 'contentForReadable';
				const fileResponse = GetFileResponseTestFactory.build({ contentForReadable });
				storageClient.get.mockResolvedValueOnce(fileResponse);

				await em.persistAndFlush(fileRecord);

				return { fileRecord, loggedInClient, query, fileResponse, contentForReadable };
			};

			it('should return 403 Forbidden', async () => {
				const { fileRecord, loggedInClient, query } = await setup();

				const response = await loggedInClient.get(`/files/${fileRecord.id}`).query(query);

				expect(response.status).toBe(403);
			});
		});
	});
});
