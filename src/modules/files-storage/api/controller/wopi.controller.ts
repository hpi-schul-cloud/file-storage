import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SingleFileParams, WopiCheckFileInfoResponse } from '../dto';
import { FilesStorageMapper } from '../mapper';
import { WopiUc } from '../uc';

@ApiTags('wopi')
//@JwtAuthentication()
@Controller('wopi/files')
export class WopiController {
	constructor(private readonly wopiUc: WopiUc) {}

	@ApiOperation({ summary: 'WOPI CheckFileInfo' })
	@ApiResponse({ status: 200, type: WopiCheckFileInfoResponse })
	@Get(':fileRecordId')
	public async checkFileInfo(
		@Param() params: SingleFileParams
		//@CurrentUser() currentUser: ICurrentUser
	): Promise<WopiCheckFileInfoResponse> {
		return await this.wopiUc.checkFileInfo(params, 'currentUser.userId');
	}

	@ApiOperation({ summary: 'WOPI GetFile (download file contents)' })
	@ApiResponse({ status: 200, description: 'Returns the file contents as a stream.' })
	@Get(':fileRecordId/contents')
	public async getFile(@Param() params: SingleFileParams): Promise<StreamableFile> {
		const fileResponse = await this.wopiUc.getFileStream(params);

		const streamableFile = FilesStorageMapper.mapToStreamableFile(fileResponse);

		return streamableFile;
	}
}
