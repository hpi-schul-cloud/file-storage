import { CurrentUser, ICurrentUser, JwtAuthentication } from '@infra/auth-guard';
import { ApiValidationError } from '@infra/error';
import {
	BadRequestException,
	Body,
	Controller,
	ForbiddenException,
	Get,
	InternalServerErrorException,
	Param,
	Post,
	Query,
	StreamableFile,
} from '@nestjs/common';
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

	@ApiOperation({ summary: 'Get Collabora access URL with permission check and access token creation' })
	@ApiResponse({ status: 201, type: AccessUrlResponse })
	@ApiResponse({ status: 400, type: ApiValidationError })
	@ApiResponse({ status: 400, type: BadRequestException })
	@ApiResponse({ status: 403, type: ForbiddenException })
	@ApiResponse({ status: 500, type: InternalServerErrorException })
	@Post('authorized-collabora-access-url')
	@JwtAuthentication()
	public async getAuthorizedCollaboraAccessUrl(
		@Body() body: DiscoveryAccessUrlParams,
		@CurrentUser() currentUser: ICurrentUser
	): Promise<AccessUrlResponse> {
		const result = await this.wopiUc.getAuthorizedCollaboraAccessUrl(currentUser.userId, body);

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
