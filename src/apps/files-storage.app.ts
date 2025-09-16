/* istanbul ignore file */
/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';

// register source-map-support for debugging
import { install as sourceMapInstall } from 'source-map-support';

// application imports
import { LoggerConfig } from '@infra/logger';
import { FilesStorageAppModule } from '@modules/files-storage-app';
import { createRequestLoggerMiddleware, enableOpenApiDocs } from './helpers';

async function bootstrap(): Promise<void> {
	sourceMapInstall();

	const nestApp = await NestFactory.create(FilesStorageAppModule);

	// customize nest app settings
	nestApp.enableCors({ exposedHeaders: ['Content-Disposition'] });

	const config = nestApp.get(LoggerConfig);

	nestApp.use(createRequestLoggerMiddleware(config.LOGGER_GLOBAL_REQUEST_LOGGING_ENABLED));

	enableOpenApiDocs(nestApp, 'api/v3/docs');

	const port = 4444;
	const basePath = '/api/v3';

	nestApp.setGlobalPrefix(basePath);
	await nestApp.init();
	nestApp.listen(port);

	console.log('#################################');
	console.log(`### Start Files Storage Server   ###`);
	console.log(`### Port:     ${port}            ###`);
	console.log(`### Base path: ${basePath}           ###`);
	console.log('#################################');
}
void bootstrap();
