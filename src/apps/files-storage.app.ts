/* istanbul ignore file */
import { NestFactory } from '@nestjs/core';

// register source-map-support for debugging
import { install as sourceMapInstall } from 'source-map-support';

// application imports
import { Logger, LOGGER_CONFIG_TOKEN } from '@infra/logger';
import { MetricsModule, ResponseTimeMetricsInterceptor } from '@infra/metrics';
import { FilesStorageAppModule } from '@modules/files-storage-app';
import { AppStartLoggable, createRequestLoggerMiddleware, enableOpenApiDocs } from './helpers';

async function bootstrap(): Promise<void> {
	sourceMapInstall();

	const nestApp = await NestFactory.create(FilesStorageAppModule);

	// customize nest app settings
	nestApp.enableCors({ exposedHeaders: ['Content-Disposition'] });

	const config = nestApp.get(LOGGER_CONFIG_TOKEN);

	nestApp.use(createRequestLoggerMiddleware(config.loggerGlobalRequestLoggingEnabled));
	nestApp.useGlobalInterceptors(new ResponseTimeMetricsInterceptor());

	enableOpenApiDocs(nestApp, 'api/v3/file/docs');

	const port = 4444;
	const basePath = '/api/v3';

	nestApp.setGlobalPrefix(basePath);
	await nestApp.init();

	const appServer = await nestApp.listen(port, async () => {
		const logger = await nestApp.resolve(Logger);
		const appStartLoggable = new AppStartLoggable({ appName: 'Files Storage Server', port, basePath });
		logger.setContext('FILES_STORAGE_APP');
		logger.info(appStartLoggable);
	});

	appServer.requestTimeout = 0;

	const metricsPort = 9090;
	const metricsApp = await NestFactory.create(MetricsModule);

	await metricsApp.listen(metricsPort, async () => {
		const logger = await metricsApp.resolve(Logger);
		const appStartLoggable = new AppStartLoggable({ appName: 'Metrics Server', port: metricsPort });
		logger.setContext('METRICS');
		logger.info(appStartLoggable);
	});
}
void bootstrap();
