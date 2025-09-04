import { FileStorageConfig } from '@modules/files-storage';
import { WopiConfig } from '@modules/wopi';
import { Injectable } from '@nestjs/common';
import { FilesStorageConfigResponse } from './dto';
import { ConfigResponseMapper } from './mapper.ts';

@Injectable()
export class FilesStorageConfigUC {
	constructor(
		private readonly wopiConfig: WopiConfig,
		private readonly filesStorageConfig: FileStorageConfig
	) {}

	public getPublicConfig(): FilesStorageConfigResponse {
		const maxFileSize = this.filesStorageConfig.FILES_STORAGE_MAX_FILE_SIZE;
		const collaboraMaxFileSize = this.wopiConfig.COLLABORA_MAX_FILE_SIZE_IN_BYTES;
		const configResponse = ConfigResponseMapper.mapToResponse(maxFileSize, collaboraMaxFileSize);

		return configResponse;
	}
}
