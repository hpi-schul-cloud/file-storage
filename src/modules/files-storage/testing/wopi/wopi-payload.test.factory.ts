import { ObjectId } from '@mikro-orm/mongodb';
import type { EntityId } from '@shared/domain/types';
import { WopiPayload, WopiPayloadFactory } from '../../domain';

class WopiPayloadTestFactory {
	private readonly props = {
		fileRecordId: new ObjectId().toHexString() as EntityId,
		canWrite: true,
		userDisplayName: 'Test User',
		userId: new ObjectId().toHexString() as EntityId,
	};

	public build(params: Partial<WopiPayload> = {}): WopiPayload {
		return WopiPayloadFactory.build({ ...this.props, ...params });
	}

	public withFileRecordId(fileRecordId: EntityId): this {
		this.props.fileRecordId = fileRecordId;

		return this;
	}

	public withCanWrite(canWrite: boolean): this {
		this.props.canWrite = canWrite;

		return this;
	}

	public withUserDisplayName(userDisplayName: string): this {
		this.props.userDisplayName = userDisplayName;

		return this;
	}

	public withUserId(userId: EntityId): this {
		this.props.userId = userId;

		return this;
	}
}

export const wopiPayloadTestFactory = (): WopiPayloadTestFactory => new WopiPayloadTestFactory();
