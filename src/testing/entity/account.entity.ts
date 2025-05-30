import { Entity, ObjectId, Property } from '@mikro-orm/mongodb';
import { BaseEntity } from '@shared/domain/entity';

@Entity()
export class AccountEntity extends BaseEntity {
	@Property()
	userId!: ObjectId;
}
