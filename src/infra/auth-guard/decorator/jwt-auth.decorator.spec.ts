import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { currentUserFactory } from '@testing/factory/currentuser.factory';
import { TestApiClient } from '@testing/test-api-client';
import { AuthGuardModule, AuthGuardOptions } from '../auth-guard.module';
import { CurrentUserInterface } from '../interface';
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

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [AuthGuardModule.register([AuthGuardOptions.JWT])],
			controllers: [TestDecoratorCurrentUserController, TestDecoratorJWTController],
		}).compile();

		app = module.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
		await module.close();
	});

	describe('JwtAuthentication', () => {
		describe('when user is not logged in', () => {
			it('should throw with UnauthorizedException', async () => {
				const response = await TestApiClient.createUnauthenticated(app, baseRouteName).get('/jwt');

				expect(response.statusCode).toEqual(401);
			});
		});

		describe('when user is logged in', () => {
			const setup = () => {
				const currentUser = currentUserFactory.build();

				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName, currentUser);

				return { loggedInClient, currentUser };
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
				const response = await TestApiClient.createUnauthenticated(app, baseRouteName).get('/currentUser');
				expect(response.statusCode).toEqual(401);
			});
		});

		describe('when user is logged in', () => {
			const setup = () => {
				const currentUser = currentUserFactory.build();

				const loggedInClient = TestApiClient.createWithJwt(app, baseRouteName, currentUser);

				const expectedCurrentUser = {
					accountId: currentUser.accountId,
					isExternalUser: false,
					roles: [...currentUser.roles],
					schoolId: currentUser.schoolId,
					support: false,
					userId: currentUser.userId,
					systemId: currentUser.systemId,
				};

				return { loggedInClient, expectedCurrentUser };
			};

			it('should return status 200 for successful request.', async () => {
				const { loggedInClient } = setup();

				const response = await loggedInClient.get('/currentUser');

				expect(response.statusCode).toEqual(200);
			});

			it('should return currentUser.', async () => {
				const { loggedInClient, expectedCurrentUser } = setup();

				const response = await loggedInClient.get('/currentUser');

				expect(response.body).toEqual(expectedCurrentUser);
			});
		});
	});
});
