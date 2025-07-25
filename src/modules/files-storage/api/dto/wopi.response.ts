/* eslint-disable max-classes-per-file */
import { ApiProperty } from '@nestjs/swagger';

export class AccessUrlResponse {
	constructor(onlineUrl: string) {
		this.onlineUrl = onlineUrl;
	}

	@ApiProperty()
	onlineUrl: string;
}
