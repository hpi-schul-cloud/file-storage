import { AntivirusModule } from '@infra/antivirus';
import { ConfigurationModule } from '@infra/configuration';
import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { PreviewGeneratorProducerModule } from '@infra/preview-generator';
import { S3ClientModule } from '@infra/s3-client';
import { Module } from '@nestjs/common';
import { FILE_RECORD_REPO, FilesStorageService, PreviewService } from './domain';
import { createS3ModuleOptions, FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from './files-storage.config';
import { FileRecordMikroOrmRepo } from './repo';

const imports = [
	ConfigurationModule.register(FileStorageConfig),
	ErrorModule,
	LoggerModule,
	AntivirusModule.forRoot(), // TODO for root() in sub Module is not ideal
	S3ClientModule.registerAsync({
		injectionToken: FILES_STORAGE_S3_CONNECTION,
		useFactory: createS3ModuleOptions,
		inject: [FileStorageConfig],
		imports: [ConfigurationModule.register(FileStorageConfig)],
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
