import { ErrorModule } from '@infra/error';
import { LoggerModule } from '@infra/logger';
import { Module } from '@nestjs/common';
import { FILE_RECORD_REPO, FilesStorageService, PreviewService } from './domain';
import { FilesStorageModule } from './files-storage.module';
import { FileRecordMikroOrmRepo } from './repo';

const imports = [ErrorModule, LoggerModule, FilesStorageModule];
const providers = [
	FilesStorageService,
	PreviewService,
	{ provide: FILE_RECORD_REPO, useClass: FileRecordMikroOrmRepo },
];

@Module({
	imports,
	providers,
	exports: [],
})
export class FilesStorageApiModule {}
