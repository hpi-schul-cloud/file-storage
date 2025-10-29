import { ObjectId } from '@mikro-orm/mongodb';
import { FileRecordParentType, StorageLocation, type ParentInfo } from '../domain';

export class ParentInfoTestFactory {
	public static build(params?: Partial<ParentInfo>): ParentInfo {
		const defaultParamsInfo = {
			storageLocation: StorageLocation.SCHOOL,
			storageLocationId: new ObjectId().toHexString(),
			parentId: new ObjectId().toHexString(),
			parentType: FileRecordParentType.User,
		};

		const parentInfo = { ...defaultParamsInfo, ...params };

		return parentInfo;
	}
}
