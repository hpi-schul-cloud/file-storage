import { Module } from '@nestjs/common';
import { MongoMemoryDatabaseModule } from '@testing/database';
import { filesStorageAppImports } from '../files-storage.app.module';
import { TEST_ENTITIES } from '../files-storage.entity.imports';

@Module({
	imports: [...filesStorageAppImports, MongoMemoryDatabaseModule.forRoot(TEST_ENTITIES)],
	controllers: [],
	providers: [],
})
export class FilesStorageTestModule {}
