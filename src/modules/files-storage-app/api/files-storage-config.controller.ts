import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FilesStorageConfigResponse } from './dto';
import { FilesStorageConfigUC } from './files-storage-config.uc';

@ApiTags('file/config')
@Controller('file/config')
export class FilesStorageConfigController {
	constructor(private readonly filesStorageConfigUC: FilesStorageConfigUC) {}

	@ApiOperation({ summary: 'Useable configuration for clients' })
	@ApiResponse({ status: 200, type: FilesStorageConfigResponse })
	@Get('/public')
	public publicConfig(): FilesStorageConfigResponse {
		const response = this.filesStorageConfigUC.getPublicConfig();

		return response;
	}
}
