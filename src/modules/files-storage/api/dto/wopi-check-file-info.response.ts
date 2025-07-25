import { ApiProperty } from '@nestjs/swagger';
import { EntityId } from '@shared/domain/types';
import { DecodeHtmlEntities } from '@shared/transformer';
import { IsOptional } from 'class-validator';

export class WopiCheckFileInfoResponse {
	constructor(props: Omit<WopiCheckFileInfoResponse, 'OwnerId'> & Partial<Pick<WopiCheckFileInfoResponse, 'OwnerId'>>) {
		this.Size = props.Size;
		this.UserId = props.UserId;
		this.UserFriendlyName = props.UserFriendlyName;
		this.BaseFileName = props.BaseFileName;
		this.UserCanWrite = props.UserCanWrite;
		this.OwnerId = props.OwnerId;
		this.LastModifiedTime = props.LastModifiedTime;
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
