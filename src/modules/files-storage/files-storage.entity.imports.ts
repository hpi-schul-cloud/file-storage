import { FileRecordEntity } from './repo/file-record.entity';
import { FileRecordSecurityCheckEmbeddable } from './repo/security-check.embeddable';

export const ENTITIES = [FileRecordEntity, FileRecordSecurityCheckEmbeddable];
export const TEST_ENTITIES = [...ENTITIES];
