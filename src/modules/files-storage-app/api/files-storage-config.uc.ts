import { FileStorageConfig } from '@modules/files-storage';
import { FILE_STORAGE_CONFIG_TOKEN } from '@modules/files-storage/files-storage.config';
import { WOPI_PUBLIC_API_CONFIG_TOKEN, WopiPublicApiConfig } from '@modules/wopi';
import { Inject, Injectable } from '@nestjs/common';
import { FilesStorageConfigResponse } from './dto';
import { ConfigResponseMapper } from './mapper.ts';

@Injectable()
export class FilesStorageConfigUc {
	constructor(
		@Inject(WOPI_PUBLIC_API_CONFIG_TOKEN) private readonly wopiConfig: WopiPublicApiConfig,
		@Inject(FILE_STORAGE_CONFIG_TOKEN) private readonly filesStorageConfig: FileStorageConfig
	) {}

	public getPublicConfig(): FilesStorageConfigResponse {
		const maxFileSize = this.filesStorageConfig.filesStorageMaxFileSize;
		const collaboraMaxFileSize = this.wopiConfig.collaboraMaxFileSizeInBytes;
		const configResponse = ConfigResponseMapper.mapToResponse(maxFileSize, collaboraMaxFileSize);

		return configResponse;
	}
}
