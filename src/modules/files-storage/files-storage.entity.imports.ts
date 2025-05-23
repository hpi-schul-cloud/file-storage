import { AccountEntity } from '@testing/entity/account.entity';
import { RoleEntity } from '@testing/entity/role.entity';
import { UserEntity } from '@testing/entity/user.entity';
import { FileRecordEntity, FileRecordSecurityCheckEmbeddable } from './repo/file-record.entity';

export const ENTITIES = [FileRecordEntity, FileRecordSecurityCheckEmbeddable];
export const TEST_ENTITIES = [...ENTITIES, UserEntity, AccountEntity, RoleEntity];
