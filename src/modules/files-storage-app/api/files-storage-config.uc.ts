import { FileStorageConfig } from '@modules/files-storage';
import { WopiPublicApiConfig } from '@modules/wopi';
import { Injectable } from '@nestjs/common';
import { FilesStorageConfigResponse } from './dto';
import { ConfigResponseMapper } from './mapper.ts';

@Injectable()
export class FilesStorageConfigUc {
	constructor(
		private readonly wopiConfig: WopiPublicApiConfig,
		private readonly filesStorageConfig: FileStorageConfig
	) {}

	public getPublicConfig(): FilesStorageConfigResponse {
		const maxFileSize = this.filesStorageConfig.FILES_STORAGE_MAX_FILE_SIZE;
		const collaboraMaxFileSize = this.wopiConfig.COLLABORA_MAX_FILE_SIZE_IN_BYTES;
		const maxFilesPerParent = this.filesStorageConfig.FILES_STORAGE_MAX_FILES_PER_PARENT;
		const configResponse = ConfigResponseMapper.mapToResponse(maxFileSize, collaboraMaxFileSize, maxFilesPerParent);

		return configResponse;
	}
}
