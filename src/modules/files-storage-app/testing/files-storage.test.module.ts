import { TEST_ENTITIES } from '@modules/files-storage/files-storage.entity.imports';
import { Module } from '@nestjs/common';
import { MongoMemoryDatabaseModule } from '@testing/database';
import { controllers, imports, providers } from '../files-storage.app.module';

@Module({
	imports: [...imports, MongoMemoryDatabaseModule.forRoot(TEST_ENTITIES)],
	controllers,
	providers,
})
export class FilesStorageTestModule {}
