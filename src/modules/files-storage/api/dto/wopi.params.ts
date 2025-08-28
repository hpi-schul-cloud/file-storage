/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';
import { EntityId } from '@shared/domain/types';
import { IsEnum, IsMongoId, IsString, Matches, MaxLength } from 'class-validator';

export enum EditorMode {
	EDIT = 'edit',
	VIEW = 'view',
}

export const accessTokenRegex = /^[a-zA-Z0-9_-]{24}$/;

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
	@Matches(accessTokenRegex, { message: 'Token must be a valid string.' })
	access_token!: string;
}
