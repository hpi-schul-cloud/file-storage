import { EntityId } from '@shared/domain/types';
import { ValueObject } from '@shared/domain/value-object.decorator';
import { IsBoolean, IsMongoId, IsString } from 'class-validator';

interface WopiPayloadProps {
	fileRecordId: EntityId;
	canWrite: boolean;
	userDisplayName: string;
	userId: EntityId;
}

@ValueObject()
export class WopiPayload {
	constructor(props: WopiPayloadProps) {
		this.fileRecordId = props.fileRecordId;
		this.canWrite = props.canWrite;
		this.userDisplayName = props.userDisplayName;
		this.userId = props.userId;
	}

	@IsMongoId()
	public readonly fileRecordId: EntityId;

	@IsBoolean()
	public readonly canWrite: boolean;

	@IsString()
	public readonly userDisplayName: string;

	@IsMongoId()
	public readonly userId: EntityId;

	public isSameFileRecordId(fileRecordId: EntityId): boolean {
		return this.fileRecordId === fileRecordId;
	}
}
