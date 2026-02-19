import { ApiProperty } from '@nestjs/swagger';

export class FilesStorageConfigResponse {
	@ApiProperty()
	MAX_FILE_SIZE: number;

	@ApiProperty()
	COLLABORA_MAX_FILE_SIZE_IN_BYTES: number;

	@ApiProperty()
	FILES_STORAGE_MAX_FILES_PER_PARENT: number;

	constructor(config: FilesStorageConfigResponse) {
		this.MAX_FILE_SIZE = config.MAX_FILE_SIZE;
		this.COLLABORA_MAX_FILE_SIZE_IN_BYTES = config.COLLABORA_MAX_FILE_SIZE_IN_BYTES;
		this.FILES_STORAGE_MAX_FILES_PER_PARENT = config.FILES_STORAGE_MAX_FILES_PER_PARENT;
	}
}
