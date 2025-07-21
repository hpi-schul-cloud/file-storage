import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AuthorizationClientAdapter } from '@infra/authorization-client';
import { accessTokenResponseTestFactory } from '@infra/authorization-client/testing';
import { CollaboraService } from '@infra/collabora';
import { EntityManager } from '@mikro-orm/mongodb';
import { FilesStorageTestModule } from '@modules/files-storage/files-storage-test.module';
import { fileRecordEntityFactory } from '@modules/files-storage/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
import { TestApiClient } from '@testing/test-api-client';
import { discoveryAccessUrlParamsTestFactory } from '../../../testing/wopi';
import { EditorMode } from '../../dto';

describe('Wopi Controller (API)', () => {
	let app: INestApplication;
	let testApiClient: TestApiClient;
	let authorizationClientAdapter: DeepMocked<AuthorizationClientAdapter>;
	let collaboraService: DeepMocked<CollaboraService>;
	let em: EntityManager;

	beforeAll(async () => {
		const moduleFixture = await Test.createTestingModule({
			imports: [FilesStorageTestModule],
		})
			.overrideProvider(AuthorizationClientAdapter)
			.useValue(createMock<AuthorizationClientAdapter>())
			.overrideProvider(CollaboraService)
			.useValue(createMock<CollaboraService>())
			.compile();

		app = moduleFixture.createNestApplication();
		await app.init();

		authorizationClientAdapter = moduleFixture.get(AuthorizationClientAdapter);
		em = moduleFixture.get(EntityManager);
		collaboraService = moduleFixture.get(CollaboraService);

		testApiClient = new TestApiClient(app, '/wopi');
	});

	afterAll(async () => {
		await app.close();
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

				collaboraService.getDiscoveryUrl.mockResolvedValue(collaboraUrl);
				authorizationClientAdapter.createToken.mockResolvedValue(token);

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

				collaboraService.getDiscoveryUrl.mockResolvedValue(collaboraUrl);
				authorizationClientAdapter.createToken.mockRejectedValue(forbiddenException);

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

				authorizationClientAdapter.createToken.mockResolvedValue(token);
				collaboraService.getDiscoveryUrl.mockRejectedValue(collaboraException);

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
});
