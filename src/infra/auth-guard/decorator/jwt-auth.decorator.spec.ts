import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TestApiClient } from '@testing/test-api-client';
import { AuthGuardModule, AuthGuardOptions } from '../auth-guard.module';
import { CurrentUserInterface } from '../interface';
import { jwtPayloadFactory } from '../testing';
import { CurrentUser, JWT, JwtAuthentication } from './jwt-auth.decorator';

const baseRouteName = '/test-decorator';
@JwtAuthentication()
@Controller(baseRouteName)
export class TestDecoratorCurrentUserController {
	@Get('currentUser')
	test(@CurrentUser() currentUser: CurrentUserInterface): CurrentUserInterface {
		return currentUser;
	}
}

@JwtAuthentication()
@Controller(baseRouteName)
export class TestDecoratorJWTController {
	@Get('jwt')
	test(@JWT() jwt: string): string {
		return jwt;
	}
}

describe('Decorators', () => {
	let app: INestApplication;
	let module: TestingModule;
	let apiClient: TestApiClient;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [AuthGuardModule.register([AuthGuardOptions.JWT])],
			controllers: [TestDecoratorCurrentUserController, TestDecoratorJWTController],
		}).compile();

		app = module.createNestApplication();
		await app.init();

		apiClient = new TestApiClient(app, baseRouteName);
	});

	afterAll(async () => {
		await app.close();
		await module.close();
	});

	describe('JwtAuthentication', () => {
		describe('when user is not logged in', () => {
			it('should throw with UnauthorizedException', async () => {
				const response = await apiClient.get('/jwt');

				expect(response.statusCode).toEqual(401);
			});
		});

		describe('when user is logged in', () => {
			const setup = () => {
				const jwtPayload = jwtPayloadFactory.build();

				const loggedInClient = apiClient.loginUsingJwt(jwtPayload);

				return { loggedInClient, jwtPayload };
			};

			it('should return status 200 for successful request.', async () => {
				const { loggedInClient } = setup();

				const response = await loggedInClient.get('/jwt');

				expect(response.statusCode).toEqual(200);
			});

			it('should return jwt token.', async () => {
				const { loggedInClient } = setup();

				const response = await loggedInClient.get('/jwt');
				// @ts-expect-error Testcase
				expect(`Bearer ${response.text}`).toEqual(loggedInClient.authHeader);
			});
		});
	});

	describe('CurrentUser', () => {
		describe('when user is not logged in', () => {
			it('should throw with UnauthorizedException', async () => {
				const response = await apiClient.get('/currentUser');
				expect(response.statusCode).toEqual(401);
			});
		});

		describe('when user is logged in', () => {
			const setup = () => {
				const jwtPayload = jwtPayloadFactory.build({ support: false, isExternalUser: false });

				delete jwtPayload.systemId;

				const loggedInClient = apiClient.loginUsingJwt(jwtPayload);

				const expectedCurrentUser = {
					accountId: jwtPayload.accountId,
					isExternalUser: false,
					roles: [...jwtPayload.roles],
					schoolId: jwtPayload.schoolId,
					support: false,
					userId: jwtPayload.userId,
				};

				return { loggedInClient, expectedCurrentUser };
			};

			it('should return status 200 for successful request.', async () => {
				const { loggedInClient } = await setup();

				const response = await loggedInClient.get('/currentUser');

				expect(response.statusCode).toEqual(200);
			});

			it('should return currentUser.', async () => {
				const { loggedInClient, expectedCurrentUser } = await setup();

				const response = await loggedInClient.get('/currentUser');

				expect(response.body).toEqual(expectedCurrentUser);
			});
		});
	});
});
