import { createMock, type DeepMocked } from '@golevelup/ts-jest';
import { Controller, ForbiddenException, Get, HttpStatus, type INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type NextFunction, type Request, type Response } from 'express';
import { type Server } from 'node:http';
import supertest from 'supertest';
import { COOKIE_CREDENTIAL_CSRF_MESSAGE, cookieCredentialCsrfMiddleware } from './cookie-credential-csrf.middleware';
import { cookieCredentialCsrfMiddleware as exportedCookieCredentialCsrfMiddleware } from './index';

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

describe('helpers barrel', () => {
	it('exports the cookie CSRF middleware', () => {
		expect(exportedCookieCredentialCsrfMiddleware).toBe(cookieCredentialCsrfMiddleware);
	});
});

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

		describe('when Sec-Fetch-Site is present', () => {
			const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;
			const deniedSites = ['cross-site', 'same-site'] as const;
			const denied = unsafeMethods.flatMap((method) =>
				deniedSites.map((fetchSite) => {
					return { method, fetchSite };
				})
			);

			it.each(denied)('denies cookie $method when Sec-Fetch-Site is $fetchSite', ({ method, fetchSite }) => {
				deny(createRequest({ method, headers: { cookie, 'sec-fetch-site': fetchSite } }));
			});

			it.each(['same-origin', 'none'])('allows POST when Sec-Fetch-Site is %s', (fetchSite) => {
				allow(createRequest({ method: 'POST', headers: { cookie, 'sec-fetch-site': fetchSite } }));
			});

			it('denies an unexpected Sec-Fetch-Site value', () => {
				deny(createRequest({ method: 'POST', headers: { cookie, 'sec-fetch-site': 'unknown' } }));
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

		describe('when Sec-Fetch-Site is absent', () => {
			describe('Origin', () => {
				it('allows an Origin with the same scheme and host', () => {
					allow(
						createRequest({
							method: 'POST',
							headers: { cookie, host: 'app.example', origin: 'https://app.example' },
						})
					);
				});

				it('denies a foreign Origin', () => {
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
			});

			describe('Referer', () => {
				it('allows a Referer with the same scheme and host when Origin is absent', () => {
					allow(
						createRequest({
							method: 'POST',
							headers: { cookie, host: 'app.example', referer: 'https://app.example/board?tab=1' },
						})
					);
				});

				it('denies a foreign Referer', () => {
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
			});

			it('denies a request with neither Origin nor Referer', () => {
				deny(createRequest({ method: 'POST', headers: { cookie, host: 'app.example' } }));
			});
		});

		describe('when the method is a safe read', () => {
			it('allows an ordinary cookie GET', () => {
				allow(createRequest({ method: 'GET', path: '/file/list/school/location/courses/parent', headers: { cookie } }));
			});

			it('allows a cookie GET for the root path', () => {
				allow(createRequest({ method: 'GET', path: '/', headers: { cookie } }));
			});

			it('ignores HEAD and OPTIONS outside the protected path', () => {
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
		});

		describe('when the path is the protected access-token GET', () => {
			it.each([
				['/wopi/authorized-collabora-document-url', 'cross-site', false],
				['/wopi/authorized-collabora-document-url/', 'same-origin', true],
				['/api/v3/wopi/authorized-collabora-document-url', 'cross-site', false],
				['/api/v3/wopi/authorized-collabora-document-url/', 'none', true],
				['/wopi/files/file-1', 'cross-site', true],
				['/wopi/authorized-collabora-document-url/extra', 'cross-site', true],
				['/WOPI/AUTHORIZED-COLLABORA-DOCUMENT-URL', 'cross-site', false],
				['/api/v3/Wopi/Authorized-Collabora-Document-Url', 'same-origin', true],
			])('protects GET %s when Sec-Fetch-Site is %s (allowed=%s)', (path, fetchSite, allowed) => {
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

	describe('generated request matrix', () => {
		const unsafeMethods = ['post', 'put', 'patch', 'delete'] as const;
		const deniedSites = ['cross-site', 'same-site'] as const;
		const denied = unsafeMethods.flatMap((method) =>
			deniedSites.map((fetchSite) => {
				return { method, fetchSite };
			})
		);

		it.each(denied)('denies cookie $method when Sec-Fetch-Site is $fetchSite', async ({ method, fetchSite }) => {
			const response = await supertest(app.getHttpServer() as Server)
				[method]('/items')
				.set('Cookie', 'jwt=token')
				.set('Sec-Fetch-Site', fetchSite)
				.send({});

			expect(response.status).toBe(HttpStatus.FORBIDDEN);
			expect(response.body).toEqual(expect.objectContaining({ message: COOKIE_CREDENTIAL_CSRF_MESSAGE }));
			expect(createCalls).toBe(0);
		});

		it.each(['same-origin', 'none'])('allows cookie POST when Sec-Fetch-Site is %s', async (fetchSite) => {
			const response = await supertest(app.getHttpServer() as Server)
				.post('/items')
				.set('Cookie', 'jwt=token')
				.set('Sec-Fetch-Site', fetchSite)
				.send({});

			expect(response.status).toBe(HttpStatus.CREATED);
			expect(createCalls).toBe(1);
		});

		it('allows a bearer POST when Sec-Fetch-Site is cross-site', async () => {
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
			expect(createCalls).toBe(0);
		});

		const deniedOrigins = [
			{ label: 'a foreign Origin', origin: 'http://evil.example' },
			{ label: 'neither Origin nor Referer', origin: undefined },
		];

		it.each(deniedOrigins)('denies cookie POST with $label', async ({ origin }) => {
			let request = supertest(app.getHttpServer() as Server)
				.post('/items')
				.set('Cookie', 'jwt=token')
				.set('Host', 'app.example');

			if (origin) {
				request = request.set('Origin', origin);
			}

			const response = await request.send({});

			expect(response.status).toBe(HttpStatus.FORBIDDEN);
			expect(response.body).toEqual(expect.objectContaining({ message: COOKIE_CREDENTIAL_CSRF_MESSAGE }));
			expect(createCalls).toBe(0);
		});

		it('allows cookie POST when Origin matches the host', async () => {
			const response = await supertest(app.getHttpServer() as Server)
				.post('/items')
				.set('Cookie', 'jwt=token')
				.set('Host', 'app.example')
				.set('Origin', 'http://app.example')
				.send({});

			expect(response.status).toBe(HttpStatus.CREATED);
			expect(createCalls).toBe(1);
		});

		const protectedPaths = ['/wopi/authorized-collabora-document-url', '/WOPI/AUTHORIZED-COLLABORA-DOCUMENT-URL'];
		const protectedReads = (['get', 'head'] as const).flatMap((method) =>
			protectedPaths.map((path) => {
				return { method, path };
			})
		);

		it.each(protectedReads)('denies a cross-site cookie $method of $path', async ({ method, path }) => {
			const response = await supertest(app.getHttpServer() as Server)
				[method](path)
				.set('Cookie', 'jwt=token')
				.set('Sec-Fetch-Site', 'cross-site');

			expect(response.status).toBe(HttpStatus.FORBIDDEN);
			if (method !== 'head') {
				expect(response.body).toEqual(expect.objectContaining({ message: COOKIE_CREDENTIAL_CSRF_MESSAGE }));
			}
			expect(accessTokenCalls).toBe(0);
		});

		it.each(protectedReads)('allows a same-origin cookie $method of $path', async ({ method, path }) => {
			const response = await supertest(app.getHttpServer() as Server)
				[method](path)
				.set('Cookie', 'jwt=token')
				.set('Sec-Fetch-Site', 'same-origin');

			expect(response.status).toBe(HttpStatus.OK);
			expect(accessTokenCalls).toBe(1);
		});
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
