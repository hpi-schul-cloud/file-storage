import { FileRecordEntity } from '../files-storage/repo/file-record.entity';
import { FileRecordSecurityCheckEmbeddable } from '../files-storage/repo/security-check.embeddable';

export const ENTITIES = [FileRecordEntity, FileRecordSecurityCheckEmbeddable];
export const TEST_ENTITIES = [...ENTITIES];
