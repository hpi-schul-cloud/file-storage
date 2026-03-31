import { AntivirusModule } from '@infra/antivirus';
import { ConfigurationModule } from '@infra/configuration';
import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { PreviewGeneratorProducerModule } from '@infra/preview-generator';
import { S3ClientModule } from '@infra/s3-client';
import { Module } from '@nestjs/common';
import { FILE_RECORD_REPO, FilesStorageService, PreviewService } from './domain';
import { TEMP_FILE_EXPIRY_SECONDS } from './domain/file-record.do';
import { TEMP_STORAGE_FOLDER } from './repo';
import { FILE_STORAGE_CONFIG_TOKEN, FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from './files-storage.config';
import { FileRecordMikroOrmRepo } from './repo';

const SECONDS_PER_DAY = 24 * 60 * 60;

const imports = [
	ConfigurationModule.register(FILE_STORAGE_CONFIG_TOKEN, FileStorageConfig),
	ErrorModule,
	LoggerModule,
	AntivirusModule.forRoot(),
	S3ClientModule.register({
		clientInjectionToken: FILES_STORAGE_S3_CONNECTION,
		configInjectionToken: FILE_STORAGE_CONFIG_TOKEN,
		configConstructor: FileStorageConfig,
		folderLifecycleRules: [
			{
				folder: TEMP_STORAGE_FOLDER,
				expirationDays: Math.ceil(TEMP_FILE_EXPIRY_SECONDS / SECONDS_PER_DAY),
			},
		],
	}),
	PreviewGeneratorProducerModule,
];

const providers = [
	FilesStorageService,
	PreviewService,
	{ provide: FILE_RECORD_REPO, useClass: FileRecordMikroOrmRepo },
];

@Module({
	imports,
	providers,
	exports: [FilesStorageService, PreviewService],
})
export class FilesStorageModule {}
