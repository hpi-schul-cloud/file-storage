import { MongoPlatform, ObjectId, Platform, Type } from '@mikro-orm/mongodb';
import { EntityId } from '@shared/domain/types';

export class ObjectIdType extends Type<EntityId, ObjectId> {
	public convertToDatabaseValue(value: EntityId, platform: Platform): ObjectId {
		this.validatePlatformSupport(platform);

		return new ObjectId(value);
	}

	public convertToJSValue(value: ObjectId, platform: Platform): EntityId {
		this.validatePlatformSupport(platform);

		return value.toHexString();
	}

	private validatePlatformSupport(platform: Platform): void {
		if (!(platform instanceof MongoPlatform)) {
			throw new Error('ObjectId custom type implemented only for Mongo.');
		}
	}
}
