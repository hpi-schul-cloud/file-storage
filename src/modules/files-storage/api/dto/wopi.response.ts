/* eslint-disable max-classes-per-file */
import { FileRecord, WopiUser } from '@modules/files-storage/domain';
import { ApiProperty } from '@nestjs/swagger';
import { EntityId } from '@shared/domain/types';
import { DecodeHtmlEntities } from '@shared/transformer';
import { IsOptional } from 'class-validator';

export class WopiCheckFileInfoResponse {
	constructor(fileRecord: FileRecord, user: WopiUser) {
		const { creatorId } = fileRecord.getProps();

		this.Size = fileRecord.sizeInByte;
		this.UserId = user.id;
		this.UserFriendlyName = user.userName;
		this.BaseFileName = fileRecord.getName();
		this.UserCanWrite = user.canWrite;
		this.OwnerId = creatorId;
		this.LastModifiedTime = fileRecord.getProps().updatedAt.toISOString();
	}

	@ApiProperty()
	@DecodeHtmlEntities()
	BaseFileName: string;

	@ApiProperty()
	Size: number;

	@ApiProperty()
	UserId: EntityId;

	@ApiProperty()
	UserCanWrite: boolean;

	@ApiProperty()
	UserFriendlyName: string;

	@ApiProperty()
	LastModifiedTime: string;

	@ApiProperty()
	@IsOptional()
	OwnerId?: EntityId;
}

export class AccessUrlResponse {
	constructor(onlineUrl: string) {
		this.onlineUrl = onlineUrl;
	}

	@ApiProperty()
	onlineUrl: string;
}
