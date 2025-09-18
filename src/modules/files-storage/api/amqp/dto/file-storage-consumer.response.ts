/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DecodeHtmlEntities } from '@shared/transformer';
import { FileRecordParentType, FileRecordProps } from '../../../domain';
import { PaginationResponse } from '../../dto';

export class FileRecordConsumerResponse {
	constructor(props: FileRecordProps) {
		this.id = props.id;
		this.name = props.name;
		this.parentId = props.parentId;
		this.parentType = props.parentType;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}

	@ApiProperty()
	id: string;

	@ApiProperty()
	@DecodeHtmlEntities()
	name: string;

	@ApiProperty()
	parentId: string;

	@ApiProperty()
	creatorId?: string;

	@ApiProperty({ enum: FileRecordParentType, enumName: 'FileRecordParentType' })
	parentType: FileRecordParentType;

	@ApiPropertyOptional()
	isUploading?: boolean;

	@ApiPropertyOptional()
	deletedSince?: Date;

	@ApiPropertyOptional()
	createdAt?: Date;

	@ApiPropertyOptional()
	updatedAt?: Date;
}

export class FileRecordConsumerListResponse extends PaginationResponse<FileRecordConsumerResponse[]> {
	constructor(data: FileRecordConsumerResponse[], total: number, skip?: number, limit?: number) {
		super(total, skip, limit);
		this.data = data;
	}

	@ApiProperty({ type: [FileRecordConsumerResponse] })
	data: FileRecordConsumerResponse[];
}
