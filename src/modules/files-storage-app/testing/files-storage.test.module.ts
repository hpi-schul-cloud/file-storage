import { Module } from '@nestjs/common';
import { MongoMemoryDatabaseModule } from '@testing/database';
import { controllers, imports, providers } from '../files-storage.app.module';
import { TEST_ENTITIES } from '../files-storage.entity.imports';

@Module({
	imports: [...imports, MongoMemoryDatabaseModule.forRoot(TEST_ENTITIES)],
	controllers,
	providers,
})
export class FilesStorageTestModule {}
