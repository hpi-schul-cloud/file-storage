import { CurrentUser, ICurrentUser, JwtAuthentication } from '@infra/auth-guard';
import { Body, Controller, Get, Param, Post, Query, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
	AccessUrlResponse,
	DiscoveryAccessUrlParams,
	SingleFileParams,
	WopiAccessTokenParams,
	WopiCheckFileInfoResponse,
} from '../dto';
import { FilesStorageMapper } from '../mapper';
import { WopiUc } from '../uc';

@ApiTags('wopi')
@Controller('wopi')
export class WopiController {
	constructor(private readonly wopiUc: WopiUc) {}

	@ApiOperation({ summary: 'WOPI Discovery Access Url to Editor Server' })
	@ApiResponse({ status: 307, description: 'Redirects to the online editor URL.' })
	@Post('discovery-access-url')
	@JwtAuthentication()
	public async discoveryAccessUrl(
		@Body() body: DiscoveryAccessUrlParams,
		@CurrentUser() currentUser: ICurrentUser
	): Promise<AccessUrlResponse> {
		const result = await this.wopiUc.discoveryAccessUrl(currentUser.userId, body);

		return result;
	}

	@ApiOperation({ summary: 'WOPI CheckFileInfo' })
	@ApiResponse({ status: 200, type: WopiCheckFileInfoResponse })
	@Get('files/:fileRecordId')
	public async checkFileInfo(
		@Param() params: SingleFileParams,
		@Query() query: WopiAccessTokenParams
	): Promise<WopiCheckFileInfoResponse> {
		return await this.wopiUc.checkFileInfo(params, query);
	}

	@ApiOperation({ summary: 'WOPI GetFile (download file contents)' })
	@ApiResponse({ status: 200, description: 'Returns the file contents as a stream.' })
	@Get('files/:fileRecordId/contents')
	public async getFile(
		@Param() params: SingleFileParams,
		@Query() query: WopiAccessTokenParams
	): Promise<StreamableFile> {
		const fileResponse = await this.wopiUc.getFileStream(params, query);

		const streamableFile = FilesStorageMapper.mapToStreamableFile(fileResponse);

		return streamableFile;
	}
}
