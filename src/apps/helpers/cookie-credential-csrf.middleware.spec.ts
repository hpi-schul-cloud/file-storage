import { createMock, type DeepMocked } from '@golevelup/ts-jest';
import { Controller, ForbiddenException, Get, HttpStatus, type INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type NextFunction, type Request, type Response } from 'express';
import { type Server } from 'node:http';
import supertest from 'supertest';
import { COOKIE_CREDENTIAL_CSRF_MESSAGE, cookieCredentialCsrfMiddleware } from './cookie-credential-csrf.middleware';

interface RequestOptions {
	method: string;
	path?: string;
	protocol?: string;
	headers?: Record<string, string>;
}

let createCalls = 0;
let accessTokenCalls = 0;

@Controller('items')
class ItemsController {
	@Post()
	public create(): { ok: boolean } {
		createCalls += 1;

		return { ok: true };
	}

	@Get()
	public find(): { ok: boolean } {
		return { ok: true };
	}
}

@Controller()
class WopiController {
	@Get('wopi/authorized-collabora-document-url')
	public authorize(): { ok: boolean } {
		accessTokenCalls += 1;

		return { ok: true };
	}
}

describe('cookieCredentialCsrfMiddleware', () => {
	const next = jest.fn() as jest.MockedFunction<NextFunction>;

	beforeEach(() => {
		next.mockClear();
	});

	const allow = (request: Request): void => {
		cookieCredentialCsrfMiddleware(request, createMock<Response>(), next);

		expect(next).toHaveBeenCalledTimes(1);
	};

	const deny = (request: Request): void => {
		expect(() => cookieCredentialCsrfMiddleware(request, createMock<Response>(), next)).toThrow(ForbiddenException);
		expect(next).not.toHaveBeenCalled();
	};

	describe('when the request is not authenticated with the jwt cookie', () => {
		it('allows a bearer request even when Sec-Fetch-Site is cross-site', () => {
			allow(
				createRequest({
					method: 'POST',
					headers: {
						authorization: 'Bearer token',
						'sec-fetch-site': 'cross-site',
					},
				})
			);
		});

		it('allows a bearer request that also sends the jwt cookie', () => {
			allow(
				createRequest({
					method: 'POST',
					headers: {
						authorization: 'Bearer token',
						cookie: 'jwt=token',
						'sec-fetch-site': 'cross-site',
					},
				})
			);
		});

		it('allows a request with a different cookie', () => {
			allow(
				createRequest({
					method: 'POST',
					headers: { cookie: 'sid=token', 'sec-fetch-site': 'cross-site' },
				})
			);
		});

		it('allows an empty jwt cookie', () => {
			allow(createRequest({ method: 'POST', headers: { cookie: 'jwt=' } }));
		});
	});

	describe('when the request is cookie-credentialed', () => {
		const cookie = 'jwt=token';

		it('denies cross-site and same-site unsafe methods', () => {
			for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
				deny(createRequest({ method, headers: { cookie, 'sec-fetch-site': 'cross-site' } }));
				next.mockClear();
				deny(createRequest({ method, headers: { cookie, 'sec-fetch-site': 'same-site' } }));
				next.mockClear();
			}
		});

		it('allows same-origin and user-agent initiated unsafe methods', () => {
			allow(createRequest({ method: 'POST', headers: { cookie, 'sec-fetch-site': 'same-origin' } }));
			next.mockClear();
			allow(createRequest({ method: 'POST', headers: { cookie, 'sec-fetch-site': 'none' } }));
		});

		it('denies an unexpected Sec-Fetch-Site value', () => {
			deny(createRequest({ method: 'POST', headers: { cookie, 'sec-fetch-site': 'unknown' } }));
		});

		it('falls back to Origin when Sec-Fetch-Site is absent', () => {
			allow(
				createRequest({
					method: 'POST',
					headers: { cookie, host: 'app.example', origin: 'https://app.example' },
				})
			);
			next.mockClear();
			deny(
				createRequest({
					method: 'POST',
					headers: { cookie, host: 'app.example', origin: 'https://evil.example' },
				})
			);
		});

		it('does not accept a matching Referer when Origin is foreign', () => {
			deny(
				createRequest({
					method: 'POST',
					headers: {
						cookie,
						host: 'app.example',
						origin: 'https://evil.example',
						referer: 'https://app.example/board',
					},
				})
			);
		});

		it('uses Referer when Origin is absent', () => {
			allow(
				createRequest({
					method: 'POST',
					headers: { cookie, host: 'app.example', referer: 'https://app.example/board?tab=1' },
				})
			);
			next.mockClear();
			deny(
				createRequest({
					method: 'POST',
					headers: { cookie, host: 'app.example', referer: 'https://evil.example/board' },
				})
			);
		});

		it('accepts the referrer header spelling', () => {
			allow(
				createRequest({
					method: 'POST',
					headers: { cookie, host: 'app.example', referrer: 'https://app.example/board' },
				})
			);
		});

		it('denies a request with neither Origin nor Referer', () => {
			deny(createRequest({ method: 'POST', headers: { cookie, host: 'app.example' } }));
		});

		it('denies an opaque or unparseable Origin', () => {
			deny(createRequest({ method: 'POST', headers: { cookie, host: 'app.example', origin: 'null' } }));
		});

		it('treats default ports as the same host', () => {
			allow(
				createRequest({
					method: 'POST',
					headers: { cookie, host: 'app.example:443', origin: 'https://app.example' },
				})
			);
		});

		it('denies a different port or scheme', () => {
			deny(
				createRequest({
					method: 'POST',
					headers: { cookie, host: 'app.example:4444', origin: 'https://app.example' },
				})
			);
			next.mockClear();
			deny(
				createRequest({
					method: 'POST',
					protocol: 'http',
					headers: { cookie, host: 'app.example', origin: 'https://app.example' },
				})
			);
		});

		it('denies when the request host is missing', () => {
			deny(createRequest({ method: 'POST', headers: { cookie, origin: 'https://app.example' } }));
		});

		it('allows an ordinary cookie GET', () => {
			allow(createRequest({ method: 'GET', path: '/file/list/school/location/courses/parent', headers: { cookie } }));
		});

		it('ignores safe methods other than the listed GET and its HEAD', () => {
			allow(
				createRequest({
					method: 'HEAD',
					path: '/file/list/school/location/courses/parent',
					headers: { cookie, 'sec-fetch-site': 'cross-site' },
				})
			);
			next.mockClear();
			allow(createRequest({ method: 'OPTIONS', headers: { cookie, 'sec-fetch-site': 'cross-site' } }));
		});

		it.each([
			['/wopi/authorized-collabora-document-url', 'cross-site', false],
			['/wopi/authorized-collabora-document-url/', 'same-origin', true],
			['/api/v3/wopi/authorized-collabora-document-url', 'cross-site', false],
			['/api/v3/wopi/authorized-collabora-document-url/', 'none', true],
			['/wopi/files/file-1', 'cross-site', true],
			['/wopi/authorized-collabora-document-url/extra', 'cross-site', true],
			['/WOPI/AUTHORIZED-COLLABORA-DOCUMENT-URL', 'cross-site', false],
			['/api/v3/Wopi/Authorized-Collabora-Document-Url', 'same-origin', true],
		])('protects the access-token GET %s when Sec-Fetch-Site is %s (allowed=%s)', (path, fetchSite, allowed) => {
			const request = createRequest({
				method: 'GET',
				path,
				headers: { cookie, 'sec-fetch-site': fetchSite },
			});

			if (allowed) {
				allow(request);

				return;
			}

			deny(request);
		});

		it.each([
			['/wopi/authorized-collabora-document-url', 'cross-site', false],
			['/wopi/authorized-collabora-document-url', 'same-origin', true],
			['/WOPI/AUTHORIZED-COLLABORA-DOCUMENT-URL', 'cross-site', false],
			['/wopi/files/file-1', 'cross-site', true],
		])('protects HEAD %s when Sec-Fetch-Site is %s (allowed=%s)', (path, fetchSite, allowed) => {
			const request = createRequest({
				method: 'HEAD',
				path,
				headers: { cookie, 'sec-fetch-site': fetchSite },
			});

			if (allowed) {
				allow(request);

				return;
			}

			deny(request);
		});

		it('still checks a non-bearer authorization scheme', () => {
			deny(
				createRequest({
					method: 'POST',
					headers: { cookie, authorization: 'Basic abc', 'sec-fetch-site': 'cross-site' },
				})
			);
		});
	});
});

describe('cookieCredentialCsrfMiddleware on a Nest app', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({ controllers: [ItemsController, WopiController] }).compile();
		app = moduleRef.createNestApplication();
		app.use(cookieCredentialCsrfMiddleware);
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(() => {
		createCalls = 0;
		accessTokenCalls = 0;
	});

	it('denies a cross-site cookie POST before the handler runs', async () => {
		const response = await supertest(app.getHttpServer() as Server)
			.post('/items')
			.set('Cookie', 'jwt=token')
			.set('Sec-Fetch-Site', 'cross-site')
			.send({ name: 'archive' });

		expect(response.status).toBe(HttpStatus.FORBIDDEN);
		expect(response.body).toEqual(expect.objectContaining({ message: COOKIE_CREDENTIAL_CSRF_MESSAGE }));
		expect(createCalls).toBe(0);
	});

	it('denies a same-site cookie POST', async () => {
		const response = await supertest(app.getHttpServer() as Server)
			.post('/items')
			.set('Cookie', 'jwt=token')
			.set('Sec-Fetch-Site', 'same-site');

		expect(response.status).toBe(HttpStatus.FORBIDDEN);
		expect(createCalls).toBe(0);
	});

	it('allows a same-origin cookie POST', async () => {
		const response = await supertest(app.getHttpServer() as Server)
			.post('/items')
			.set('Cookie', 'jwt=token')
			.set('Sec-Fetch-Site', 'same-origin')
			.send({});

		expect(response.status).toBe(HttpStatus.CREATED);
		expect(createCalls).toBe(1);
	});

	it('denies a cookie POST with a foreign Origin when Sec-Fetch-Site is absent', async () => {
		const response = await supertest(app.getHttpServer() as Server)
			.post('/items')
			.set('Cookie', 'jwt=token')
			.set('Host', 'app.example')
			.set('Origin', 'http://evil.example')
			.send({});

		expect(response.status).toBe(HttpStatus.FORBIDDEN);
		expect(createCalls).toBe(0);
	});

	it('denies a cookie POST with neither Origin nor Referer', async () => {
		const response = await supertest(app.getHttpServer() as Server)
			.post('/items')
			.set('Cookie', 'jwt=token')
			.set('Host', 'app.example')
			.send({});

		expect(response.status).toBe(HttpStatus.FORBIDDEN);
		expect(createCalls).toBe(0);
	});

	it('allows a cookie POST when Origin matches the request host', async () => {
		const response = await supertest(app.getHttpServer() as Server)
			.post('/items')
			.set('Cookie', 'jwt=token')
			.set('Host', 'app.example')
			.set('Origin', 'http://app.example')
			.send({});

		expect(response.status).toBe(HttpStatus.CREATED);
		expect(createCalls).toBe(1);
	});

	it('allows a bearer POST without a cookie when Sec-Fetch-Site is cross-site', async () => {
		const response = await supertest(app.getHttpServer() as Server)
			.post('/items')
			.set('Authorization', 'Bearer token')
			.set('Sec-Fetch-Site', 'cross-site')
			.send({});

		expect(response.status).toBe(HttpStatus.CREATED);
		expect(createCalls).toBe(1);
	});

	it('allows an ordinary cookie GET', async () => {
		const response = await supertest(app.getHttpServer() as Server)
			.get('/items')
			.set('Cookie', 'jwt=token')
			.set('Sec-Fetch-Site', 'cross-site');

		expect(response.status).toBe(HttpStatus.OK);
	});

	it('denies a cross-site authorized-collabora-document-url GET and allows a same-origin one', async () => {
		const denied = await supertest(app.getHttpServer() as Server)
			.get('/wopi/authorized-collabora-document-url')
			.set('Cookie', 'jwt=token')
			.set('Sec-Fetch-Site', 'cross-site');

		expect(denied.status).toBe(HttpStatus.FORBIDDEN);
		expect(accessTokenCalls).toBe(0);

		const allowed = await supertest(app.getHttpServer() as Server)
			.get('/wopi/authorized-collabora-document-url')
			.set('Cookie', 'jwt=token')
			.set('Sec-Fetch-Site', 'same-origin');

		expect(allowed.status).toBe(HttpStatus.OK);
		expect(accessTokenCalls).toBe(1);
	});

	it('denies a mixed-case cross-site GET before the handler runs', async () => {
		const response = await supertest(app.getHttpServer() as Server)
			.get('/WOPI/AUTHORIZED-COLLABORA-DOCUMENT-URL')
			.set('Cookie', 'jwt=token')
			.set('Sec-Fetch-Site', 'cross-site');

		expect(response.status).toBe(HttpStatus.FORBIDDEN);
		expect(accessTokenCalls).toBe(0);
	});

	it('denies a cross-site HEAD to the access-token route before the handler runs', async () => {
		const denied = await supertest(app.getHttpServer() as Server)
			.head('/wopi/authorized-collabora-document-url')
			.set('Cookie', 'jwt=token')
			.set('Sec-Fetch-Site', 'cross-site');

		expect(denied.status).toBe(HttpStatus.FORBIDDEN);
		expect(accessTokenCalls).toBe(0);

		const allowed = await supertest(app.getHttpServer() as Server)
			.head('/wopi/authorized-collabora-document-url')
			.set('Cookie', 'jwt=token')
			.set('Sec-Fetch-Site', 'same-origin');

		expect(allowed.status).toBe(HttpStatus.OK);
		expect(accessTokenCalls).toBe(1);
	});
});

function createRequest(options: RequestOptions): Request {
	const headers = Object.fromEntries(
		Object.entries(options.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value])
	);
	const request: DeepMocked<Request> = createMock<Request>({
		method: options.method,
		path: options.path ?? '/items',
		protocol: options.protocol ?? 'https',
		headers,
	});
	request.get.mockImplementation((name: string) => headers[name.toLowerCase()]);

	return request;
}
