import { FileRecord, WopiUser } from '@modules/files-storage/domain';
import { ApiProperty } from '@nestjs/swagger';
import { EntityId } from '@shared/domain/types';
import { DecodeHtmlEntities } from '@shared/transformer';

export class WopiCheckFileInfoResponse {
	constructor(fileRecord: FileRecord, user: WopiUser) {
		const { creatorId } = fileRecord.getProps();
		this.Size = fileRecord.sizeInByte;
		this.UserId = user.id;
		this.UserFriendlyName = user.userName;
		this.BaseFileName = fileRecord.getName();
		this.OwnerID = creatorId ?? user.id;
		this.UserCanWrite = user.canWrite;
	}

	@ApiProperty()
	@DecodeHtmlEntities()
	BaseFileName: string;

	@ApiProperty()
	Size: number;

	@ApiProperty()
	OwnerID: EntityId;

	@ApiProperty()
	UserId: EntityId;

	@ApiProperty()
	UserCanWrite: boolean;

	@ApiProperty()
	UserFriendlyName: string;
}
