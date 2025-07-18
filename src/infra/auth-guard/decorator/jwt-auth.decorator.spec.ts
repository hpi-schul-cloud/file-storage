import { EntityManager } from '@mikro-orm/mongodb';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryDatabaseModule } from '@testing/database';
import { AccountEntity } from '@testing/entity/account.entity';
import { RoleEntity } from '@testing/entity/role.entity';
import { UserEntity } from '@testing/entity/user.entity';
import { UserAndAccountTestFactory } from '@testing/factory/user-and-account.test.factory';
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
	let em: EntityManager;
	let apiClient: TestApiClient;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [
				AuthGuardModule.register([AuthGuardOptions.JWT]),
				MongoMemoryDatabaseModule.forRoot([UserEntity, AccountEntity, RoleEntity]),
			],
			controllers: [TestDecoratorCurrentUserController, TestDecoratorJWTController],
		}).compile();

		app = module.createNestApplication();
		await app.init();

		em = module.get(EntityManager);
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
			const setup = async () => {
				const { teacherAccount, teacherUser } = UserAndAccountTestFactory.buildTeacher();

				await em.persistAndFlush([teacherAccount, teacherUser]);
				em.clear();

				const loggedInClient = apiClient.loginByUser(teacherAccount, teacherUser);

				return { loggedInClient, teacherUser };
			};

			it('should return status 200 for successful request.', async () => {
				const { loggedInClient } = await setup();

				const response = await loggedInClient.get('/jwt');

				expect(response.statusCode).toEqual(200);
			});

			it('should return jwt token.', async () => {
				const { loggedInClient } = await setup();

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
			const setup = async () => {
				const { teacherAccount, teacherUser } = UserAndAccountTestFactory.buildTeacher();

				await em.persistAndFlush([teacherAccount, teacherUser]);
				em.clear();

				const loggedInClient = apiClient.loginByUser(teacherAccount, teacherUser);

				const expectedCurrentUser = {
					accountId: teacherAccount.id,
					isExternalUser: false,
					roles: [teacherUser.roles[0].id],
					schoolId: teacherUser.school.toHexString(),
					support: false,
					userId: teacherUser.id,
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
