import { ValueObject } from '@shared/domain/value-object.decorator';
import { IsMimeType, IsOptional, IsString } from 'class-validator';

@ValueObject()
export class FileInfo {
	constructor(props: FileInfo) {
		this.name = props.name;
		this.encoding = props.encoding;
		this.mimeType = props.mimeType;
	}

	@IsString()
	public readonly name: string;

	@IsString()
	@IsMimeType()
	public readonly mimeType: string;

	@IsString()
	@IsOptional()
	public readonly encoding?: string;
}
