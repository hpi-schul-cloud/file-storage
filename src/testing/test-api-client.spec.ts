import { ObjectId } from '@mikro-orm/mongodb';
import {
	Controller,
	Delete,
	Get,
	Headers,
	HttpStatus,
	INestApplication,
	Patch,
	Post,
	Put,
	UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserAndAccountTestFactory } from './factory/user-and-account.test.factory';
import { TestApiClient } from './test-api-client';

@Controller('')
class TestController {
	@Delete(':id')
	delete(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'delete', authorization });
	}

	@Post()
	post(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'post', authorization });
	}

	@Get(':id')
	get(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'get', authorization });
	}

	@Put()
	put(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'put', authorization });
	}

	@Patch(':id')
	patch(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'patch', authorization });
	}

	@Post('/authentication/local')
	jwt() {
		return Promise.resolve({ accessToken: '123' });
	}
}

@Controller('')
class TestErrorController {
	@Post('/authentication/local')
	jwt() {
		return Promise.reject(new UnauthorizedException());
	}
}

@Controller('')
class TestXApiKeyController {
	@Delete(':id')
	delete(@Headers('X-API-KEY') authorization: string) {
		return Promise.resolve({ method: 'delete', authorization });
	}

	@Post()
	post(@Headers('X-API-KEY') authorization: string) {
		return Promise.resolve({ method: 'post', authorization });
	}

	@Get(':id')
	get(@Headers('X-API-KEY') authorization: string) {
		return Promise.resolve({ method: 'get', authorization });
	}
}

describe(TestApiClient.name, () => {
	describe('when test request instance exists - jwt auth', () => {
		let app: INestApplication;

		beforeAll(async () => {
			const moduleFixture = await Test.createTestingModule({
				controllers: [TestController],
			}).compile();

			app = moduleFixture.createNestApplication();

			await app.init();
		});

		afterAll(async () => {
			await app.close();
		});

		const setup = () => {
			const testApiClient = new TestApiClient(app, '');
			const { studentAccount, studentUser } = UserAndAccountTestFactory.buildStudent();
			const id = new ObjectId().toHexString();

			return { testApiClient, studentAccount, studentUser, id };
		};

		describe('login', () => {
			it('should store formatted jwt', async () => {
				const { testApiClient, studentAccount, studentUser } = setup();

				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				// eslint-disable-next-line @typescript-eslint/dot-notation
				expect(loggedInClient['authHeader']).toEqual(expect.any(String));
			});

			it('should fork the client', async () => {
				const { testApiClient, studentAccount, studentUser } = setup();

				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);

				expect(loggedInClient).not.toStrictEqual(testApiClient);
			});
		});

		describe('get', () => {
			it('should resolve requests', async () => {
				const { testApiClient, id } = setup();

				const result = await testApiClient.get(id);

				expect(result.statusCode).toEqual(HttpStatus.OK);
				expect(result.body).toEqual(expect.objectContaining({ method: 'get' }));
			});

			it('should pass the bearer token', async () => {
				const { testApiClient, studentAccount, studentUser, id } = setup();

				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const result = await loggedInClient.get(id);

				expect(result.body).toEqual(expect.objectContaining({ authorization: expect.any(String) }));
			});
		});

		describe('post', () => {
			it('should resolve requests', async () => {
				const { testApiClient } = setup();

				const result = await testApiClient.post();

				expect(result.statusCode).toEqual(HttpStatus.CREATED);
				expect(result.body).toEqual(expect.objectContaining({ method: 'post' }));
			});

			it('should pass the bearer token', async () => {
				const { testApiClient, studentAccount, studentUser } = setup();

				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const result = await loggedInClient.post();

				expect(result.body).toEqual(expect.objectContaining({ authorization: expect.any(String) }));
			});
		});

		describe('delete', () => {
			it('should resolve requests', async () => {
				const { testApiClient, id } = setup();

				const result = await testApiClient.delete(id);

				expect(result.statusCode).toEqual(HttpStatus.OK);
				expect(result.body).toEqual(expect.objectContaining({ method: 'delete' }));
			});

			it('should pass the bearer token', async () => {
				const { testApiClient, studentAccount, studentUser, id } = setup();

				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const result = await loggedInClient.delete(id);

				expect(result.body).toEqual(expect.objectContaining({ authorization: expect.any(String) }));
			});
		});

		describe('put', () => {
			it('should resolve requests', async () => {
				const { testApiClient } = setup();

				const result = await testApiClient.put();

				expect(result.statusCode).toEqual(HttpStatus.OK);
				expect(result.body).toEqual(expect.objectContaining({ method: 'put' }));
			});

			it('should pass the bearer token', async () => {
				const { testApiClient, studentAccount, studentUser } = setup();

				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const result = await loggedInClient.put();

				expect(result.body).toEqual(expect.objectContaining({ authorization: expect.any(String) }));
			});
		});

		describe('patch', () => {
			it('should resolve requests', async () => {
				const { testApiClient, id } = setup();

				const result = await testApiClient.patch(id);

				expect(result.statusCode).toEqual(HttpStatus.OK);
				expect(result.body).toEqual(expect.objectContaining({ method: 'patch' }));
			});

			it('should pass the bearer token', async () => {
				const { testApiClient, studentAccount, studentUser, id } = setup();

				const loggedInClient = await testApiClient.loginByUser(studentAccount, studentUser);
				const result = await loggedInClient.patch(id);

				expect(result.body).toEqual(expect.objectContaining({ authorization: expect.any(String) }));
			});
		});
	});

	describe('when test request instance exists - x-api-key auth', () => {
		let app: INestApplication;
		const API_KEY = '7ccd4e11-c6f6-48b0-81eb-cccf7922e7a4';

		beforeAll(async () => {
			const moduleFixture = await Test.createTestingModule({
				controllers: [TestXApiKeyController],
			}).compile();

			app = moduleFixture.createNestApplication();

			await app.init();
		});

		afterAll(async () => {
			await app.close();
		});

		const setup = () => {
			const testApiClient = new TestApiClient(app, '', API_KEY, true);
			const id = new ObjectId().toHexString();

			return { testApiClient, id };
		};

		describe('get', () => {
			it('should resolve requests', async () => {
				const { testApiClient, id } = setup();

				const result = await testApiClient.get(id);

				expect(result.statusCode).toEqual(HttpStatus.OK);
				expect(result.body).toEqual(expect.objectContaining({ method: 'get' }));
			});
		});

		describe('post', () => {
			it('should resolve requests', async () => {
				const { testApiClient } = setup();

				const result = await testApiClient.post();

				expect(result.statusCode).toEqual(HttpStatus.CREATED);
				expect(result.body).toEqual(expect.objectContaining({ method: 'post' }));
			});
		});

		describe('delete', () => {
			it('should resolve requests', async () => {
				const { testApiClient, id } = setup();

				const result = await testApiClient.delete(id);

				expect(result.statusCode).toEqual(HttpStatus.OK);
				expect(result.body).toEqual(expect.objectContaining({ method: 'delete' }));
			});
		});
	});
});
