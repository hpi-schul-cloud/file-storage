import { ApiProperty } from '@nestjs/swagger';

export class PutFileResponse {
	constructor(props: PutFileResponse) {
		this.LastModifiedTime = props.LastModifiedTime;
	}

	@ApiProperty()
	LastModifiedTime: string;
}
