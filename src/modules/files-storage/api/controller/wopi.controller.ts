import { CurrentUser, ICurrentUser, JWT, JwtAuthentication } from '@infra/auth-guard';
import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SingleFileParams, WopiCheckFileInfoResponse } from '../dto';
import { FilesStorageMapper } from '../mapper';
import { WopiUc } from '../uc';

@ApiTags('wopi')
@JwtAuthentication()
@Controller('wopi')
export class WopiController {
	constructor(private readonly wopiUc: WopiUc) {}

	@ApiOperation({ summary: 'WOPI Discovery Editor Server' })
	@ApiResponse({ status: 307, description: 'Redirects to the online editor URL.' })
	@Get('discovery-editor-url/:fileRecordId')
	public async discoveryEditorUrl(
		@Param() params: SingleFileParams,
		@Res({ passthrough: true }) response: Response,
		@JWT() jwt: string
	): Promise<void> {
		const fileRecordId: string = params.fileRecordId;
		const onlineUrl = await this.wopiUc.discoveryEditorUrl(fileRecordId, jwt);

		response.redirect(307, onlineUrl);
	}

	@ApiOperation({ summary: 'WOPI CheckFileInfo' })
	@ApiResponse({ status: 200, type: WopiCheckFileInfoResponse })
	@Get('files/:fileRecordId')
	public async checkFileInfo(
		@Param() params: SingleFileParams,
		@CurrentUser() currentUser: ICurrentUser
	): Promise<WopiCheckFileInfoResponse> {
		return await this.wopiUc.checkFileInfo(params, currentUser.userId);
	}

	@ApiOperation({ summary: 'WOPI GetFile (download file contents)' })
	@ApiResponse({ status: 200, description: 'Returns the file contents as a stream.' })
	@Get('files/:fileRecordId/contents')
	public async getFile(@Param() params: SingleFileParams): Promise<StreamableFile> {
		const fileResponse = await this.wopiUc.getFileStream(params);

		const streamableFile = FilesStorageMapper.mapToStreamableFile(fileResponse);

		return streamableFile;
	}
}
