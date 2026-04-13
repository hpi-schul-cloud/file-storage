import { AntivirusModule } from '@infra/antivirus';
import { ConfigurationModule } from '@infra/configuration';
import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { PreviewGeneratorProducerModule } from '@infra/preview-generator';
import { S3ClientModule } from '@infra/s3-client';
import { Module } from '@nestjs/common';
import {
	FILE_RECORD_REPO,
	FilesStorageService,
	FolderExpirationDays,
	PreviewService,
	StorageFolders,
	StorageType,
} from './domain';
import { FILE_STORAGE_CONFIG_TOKEN, FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from './files-storage.config';
import { FileRecordMikroOrmRepo } from './repo';

const imports = [
	ConfigurationModule.register(FILE_STORAGE_CONFIG_TOKEN, FileStorageConfig),
	ErrorModule,
	LoggerModule,
	AntivirusModule.forRoot(),
	S3ClientModule.register({
		clientInjectionToken: FILES_STORAGE_S3_CONNECTION,
		configInjectionToken: FILE_STORAGE_CONFIG_TOKEN,
		configConstructor: FileStorageConfig,
		trashFolderName: StorageFolders.TRASH,
		folderLifecycleRules: [
			{
				folder: StorageFolders.TRASH,
				expirationDays: FolderExpirationDays.TRASH,
			},
			{
				folder: StorageFolders[StorageType.TEMP],
				expirationDays: FolderExpirationDays[StorageType.TEMP],
			},
			{
				folder: StorageFolders.PREVIEW,
				expirationDays: FolderExpirationDays.PREVIEW,
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
