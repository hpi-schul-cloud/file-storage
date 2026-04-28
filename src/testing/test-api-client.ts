import { INestApplication } from '@nestjs/common';
import type { Server } from 'node:net';
import supertest from 'supertest';
import { currentUserFactory, type CurrentUser } from './factory/currentuser.factory';
import { JwtAuthenticationFactory } from './factory/jwt-authentication.factory';

const headerConst = {
	accept: 'accept',
	json: 'application/json',
};

/**
 * Note res.cookie is not supported atm, feel free to add this
 */
export class TestApiClient {
	private constructor(
		private readonly app: INestApplication<Server>,
		private readonly baseRoute: string,
		private readonly authHeader: string,
		private readonly kindOfAuth: string
	) {
		this.baseRoute = this.checkAndAddPrefix(baseRoute);
	}

	public get(subPath?: string): supertest.Test {
		const path = this.getPath(subPath);
		const testRequestInstance = supertest(this.app.getHttpServer())
			.get(path)
			.set(this.kindOfAuth, this.authHeader)
			.set(headerConst.accept, headerConst.json);

		return testRequestInstance;
	}

	public delete<T extends object | string>(subPath?: string, data?: T): supertest.Test {
		const path = this.getPath(subPath);
		const testRequestInstance = supertest(this.app.getHttpServer())
			.delete(path)
			.set(this.kindOfAuth, this.authHeader)
			.set(headerConst.accept, headerConst.json)
			.send(data);

		return testRequestInstance;
	}

	public put<T extends object | string>(subPath?: string, data?: T): supertest.Test {
		const path = this.getPath(subPath);
		const testRequestInstance = supertest(this.app.getHttpServer())
			.put(path)
			.set(this.kindOfAuth, this.authHeader)
			.send(data);

		return testRequestInstance;
	}

	public patch<T extends object | string>(subPath?: string, data?: T): supertest.Test {
		const path = this.getPath(subPath);
		const testRequestInstance = supertest(this.app.getHttpServer())
			.patch(path)
			.set(this.kindOfAuth, this.authHeader)
			.send(data);

		return testRequestInstance;
	}

	public post<T extends object | string>(subPath?: string, data?: T): supertest.Test {
		const path = this.getPath(subPath);
		const testRequestInstance = supertest(this.app.getHttpServer())
			.post(path)
			.set(this.kindOfAuth, this.authHeader)
			.set(headerConst.accept, headerConst.json)
			.send(data);

		return testRequestInstance;
	}

	public postWithAttachment(
		subPath: string | undefined,
		fieldName: string,
		data: Buffer,
		fileName: string
	): supertest.Test {
		const path = this.getPath(subPath);
		const testRequestInstance = supertest(this.app.getHttpServer())
			.post(path)
			.set(this.kindOfAuth, this.authHeader)
			.attach(fieldName, data, fileName);

		return testRequestInstance;
	}

	public static createWithJwt(app: INestApplication, baseRoute: string, currentUser?: CurrentUser): TestApiClient {
		const defaultPayload = currentUser ?? currentUserFactory.build();
		const jwt = JwtAuthenticationFactory.createJwt(defaultPayload);

		const authHeader = `Bearer ${jwt}`;
		const kindOfAuth = 'authorization';
		const instance = new TestApiClient(app, baseRoute, authHeader, kindOfAuth);

		return instance;
	}

	public static createWithApiKey(app: INestApplication, baseRoute: string, apiKey: string): TestApiClient {
		const authHeader = `${apiKey}`;
		const kindOfAuth = 'X-API-KEY';
		const instance = new TestApiClient(app, baseRoute, authHeader, kindOfAuth);

		return instance;
	}

	public static createUnauthenticated(app: INestApplication, baseRoute: string): TestApiClient {
		const authHeader = 'Wrong auth header';
		const kindOfAuth = 'authorization';
		const instance = new TestApiClient(app, baseRoute, authHeader, kindOfAuth);

		return instance;
	}

	public getAuthHeader(): string {
		return this.authHeader;
	}

	private isSlash(inputPath: string, pos: number): boolean {
		const isSlash = inputPath.charAt(pos) === '/';

		return isSlash;
	}

	private checkAndAddPrefix(inputPath = '/'): string {
		let path = '';
		if (!this.isSlash(inputPath, 0)) {
			path = '/';
		}
		path += inputPath;

		return path;
	}

	private cleanupPath(inputPath: string): string {
		let path = inputPath;
		if (this.isSlash(path, 0) && this.isSlash(path, 1)) {
			path = path.slice(1);
		}

		return path;
	}

	private getPath(routeNameInput = ''): string {
		const routeName = this.checkAndAddPrefix(routeNameInput);
		const path = this.cleanupPath(this.baseRoute + routeName);

		return path;
	}
}
