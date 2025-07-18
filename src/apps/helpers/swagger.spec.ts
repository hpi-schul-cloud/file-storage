import { FilesStorageTestModule } from '@modules/files-storage/files-storage-test.module';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Server } from 'node:net';
import request from 'supertest';
import { enableOpenApiDocs } from './swagger';

describe('swagger setup', () => {
	describe('when adding swagger to an app', () => {
		let app: INestApplication<Server>;

		beforeAll(async () => {
			app = await NestFactory.create(FilesStorageTestModule);
			enableOpenApiDocs(app, 'docs');
			await app.init();
		});

		afterAll(async () => {
			await app.close();
		});

		it('should redirect', async () => {
			const response = await request(app.getHttpServer()).get('/docs').redirects(1);
			expect(response.text).toContain('Swagger UI');
		});

		it('should serve open api documentation at given path', async () => {
			const response = await request(app.getHttpServer()).get('/docs/');
			expect(response.text).toContain('Swagger UI');
		});

		it('should serve a json api version', async () => {
			const response = await request(app.getHttpServer()).get('/docs-json').expect(200);

			expect(response.body.info).toEqual({
				contact: {},
				description: 'This is the API documentation for the Schulcloud-Verbund-Software File Storage API',
				title: 'Schulcloud-Verbund-Software File Storage API',
				// care about api changes when version changes
				version: '3.0',
			});
		});
	});
});
