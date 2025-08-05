/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import { EntityId } from '@shared/domain/types';
import { IsEnum, IsMongoId, IsString, IsUUID, MaxLength } from 'class-validator';

export enum EditorMode {
	EDIT = 'edit',
	VIEW = 'view',
}

export class AuthorizedCollaboraDocumentUrlParams {
	@ApiProperty()
	@IsMongoId()
	fileRecordId!: EntityId;

	@ApiProperty({ enum: EditorMode, enumName: 'EditorMode' })
	@IsEnum(EditorMode)
	editorMode!: EditorMode;

	@ApiProperty()
	@IsString()
	@MaxLength(100)
	userDisplayName!: string;
}

export class WopiAccessTokenParams {
	@ApiProperty()
	@IsUUID()
	access_token!: string;
}
