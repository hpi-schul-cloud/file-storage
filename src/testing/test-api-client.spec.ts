import { ObjectId } from '@mikro-orm/mongodb';
import { Controller, Delete, Get, Headers, HttpStatus, INestApplication, Patch, Post, Put } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TestApiClient } from './test-api-client';

@Controller('/with-jwt')
class TestController {
	@Delete(':id')
	public delete(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'delete', authorization });
	}

	@Post()
	public post(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'post', authorization });
	}

	@Get(':id')
	public get(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'get', authorization });
	}

	@Put()
	public put(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'put', authorization });
	}

	@Patch(':id')
	public patch(@Headers('authorization') authorization: string) {
		return Promise.resolve({ method: 'patch', authorization });
	}

	@Post('/authentication/local')
	public jwt() {
		return Promise.resolve({ accessToken: '123' });
	}
}

@Controller('/with-x-api-key')
class TestXApiKeyController {
	@Delete(':id')
	public delete(@Headers('X-API-KEY') authorization: string) {
		return Promise.resolve({ method: 'delete', authorization });
	}

	@Post()
	public post(@Headers('X-API-KEY') authorization: string) {
		return Promise.resolve({ method: 'post', authorization });
	}

	@Get(':id')
	public get(@Headers('X-API-KEY') authorization: string) {
		return Promise.resolve({ method: 'get', authorization });
	}
}

describe(TestApiClient.name, () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleFixture = await Test.createTestingModule({
			controllers: [TestController, TestXApiKeyController],
		}).compile();

		app = moduleFixture.createNestApplication();

		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('when test request instance exists - jwt auth', () => {
		const setup = () => {
			const testApiClient = TestApiClient.createWithJwt(app, '/with-jwt');

			const id = new ObjectId().toHexString();

			return { testApiClient, id };
		};

		describe('when client is created with JWT', () => {
			it('should store formatted jwt', () => {
				const { testApiClient } = setup();

				// eslint-disable-next-line @typescript-eslint/dot-notation
				expect(testApiClient['authHeader']).toEqual(expect.any(String));
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
				const { testApiClient, id } = setup();

				const result = await testApiClient.get(id);

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
				const { testApiClient } = setup();

				const result = await testApiClient.post();

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
				const { testApiClient, id } = setup();

				const result = await testApiClient.delete(id);

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
				const { testApiClient } = setup();

				const result = await testApiClient.put();

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
				const { testApiClient, id } = setup();

				const result = await testApiClient.patch(id);

				expect(result.body).toEqual(expect.objectContaining({ authorization: expect.any(String) }));
			});
		});
	});

	describe('when test request instance exists - x-api-key auth', () => {
		const setup = () => {
			const API_KEY = '7ccd4e11-c6f6-48b0-81eb-cccf7922e7a4';
			const testApiClient = TestApiClient.createWithApiKey(app, '/with-x-api-key', API_KEY);
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

	describe('when test request instance exists - unauthenticated', () => {
		const setup = () => {
			const testApiClient = TestApiClient.createUnauthenticated(app, '/with-jwt');
			const id = new ObjectId().toHexString();

			return { testApiClient, id };
		};

		describe('get', () => {
			it('should resolve requests', async () => {
				const { testApiClient, id } = setup();

				const result = await testApiClient.get(id);

				expect(result.statusCode).toEqual(HttpStatus.OK);
				expect(result.body).toEqual(expect.objectContaining({ method: 'get', authorization: 'Wrong auth header' }));
			});
		});
	});
});
