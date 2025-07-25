/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';

export class AccessUrlResponse {
	constructor(props: AccessUrlResponse) {
		this.onlineUrl = props.onlineUrl;
	}

	@ApiProperty()
	onlineUrl: string;
}
