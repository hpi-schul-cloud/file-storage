import { ApiProperty } from '@nestjs/swagger';

export class FilesStorageConfigResponse {
	@ApiProperty()
	MAX_FILE_SIZE: number;

	@ApiProperty()
	COLLABORA_MAX_FILE_SIZE_IN_BYTES: number;

	constructor(config: FilesStorageConfigResponse) {
		this.MAX_FILE_SIZE = config.MAX_FILE_SIZE;
		this.COLLABORA_MAX_FILE_SIZE_IN_BYTES = config.COLLABORA_MAX_FILE_SIZE_IN_BYTES;
	}
}
