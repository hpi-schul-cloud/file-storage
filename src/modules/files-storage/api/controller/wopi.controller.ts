import { CurrentUser, ICurrentUser, JwtAuthentication } from '@infra/auth-guard';
import { ApiValidationError } from '@infra/error';
import { FileStorageConfig } from '@modules/files-storage/files-storage.config';
import {
	BadRequestException,
	Body,
	Controller,
	ForbiddenException,
	Get,
	HttpCode,
	InternalServerErrorException,
	Param,
	Post,
	Query,
	Req,
	StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Readable } from 'stream';
import {
	AuthorizedCollaboraDocumentUrlParams,
	AuthorizedCollaboraDocumentUrlResponse,
	PutFileResponse,
	SingleFileParams,
	WopiAccessTokenParams,
	WopiFileInfoResponse,
} from '../dto';
import { PutFileResponseFactory } from '../factory';
import { FilesStorageMapper } from '../mapper';
import { WopiUc } from '../uc';

@ApiTags('wopi')
@Controller('wopi')
export class WopiController {
	constructor(
		private readonly wopiUc: WopiUc,
		private readonly config: FileStorageConfig
	) {}

	private ensureWopiEnabled(): void {
		if (!this.config.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED) {
			throw new ForbiddenException('WOPI feature is disabled');
		}
	}

	@ApiOperation({ summary: 'Get Collabora access URL with permission check and access token creation' })
	@ApiResponse({ status: 201, type: AuthorizedCollaboraDocumentUrlResponse })
	@ApiResponse({ status: 400, type: ApiValidationError })
	@ApiResponse({ status: 400, type: BadRequestException })
	@ApiResponse({ status: 403, type: ForbiddenException })
	@ApiResponse({ status: 500, type: InternalServerErrorException })
	@Get('authorized-collabora-document-url')
	@JwtAuthentication()
	public async getAuthorizedCollaboraDocumentUrl(
		@Body() body: AuthorizedCollaboraDocumentUrlParams,
		@CurrentUser() currentUser: ICurrentUser
	): Promise<AuthorizedCollaboraDocumentUrlResponse> {
		this.ensureWopiEnabled();

		const result = await this.wopiUc.getAuthorizedCollaboraDocumentUrl(currentUser.userId, body);

		return result;
	}

	@ApiOperation({ summary: 'WOPI CheckFileInfo' })
	@ApiResponse({ status: 200, type: WopiFileInfoResponse })
	@Get('files/:fileRecordId')
	public async checkFileInfo(
		@Param() params: SingleFileParams,
		@Query() query: WopiAccessTokenParams
	): Promise<WopiFileInfoResponse> {
		this.ensureWopiEnabled();

		return await this.wopiUc.checkFileInfo(params, query);
	}

	@ApiOperation({ summary: 'WOPI GetFile (download file contents)' })
	@ApiResponse({ status: 200, description: 'Returns the file contents as a stream.' })
	@Get('files/:fileRecordId/contents')
	public async getFile(
		@Param() params: SingleFileParams,
		@Query() query: WopiAccessTokenParams
	): Promise<StreamableFile> {
		this.ensureWopiEnabled();

		const fileResponse = await this.wopiUc.getFileStream(params, query);
		const streamableFile = FilesStorageMapper.mapToStreamableFile(fileResponse);

		return streamableFile;
	}

	@HttpCode(200)
	@ApiOperation({ summary: 'WOPI PutFile (update file contents)' })
	@ApiResponse({ status: 200, description: 'Updates the file contents.' })
	@Post('files/:fileRecordId/contents')
	public async putFile(
		@Param() params: SingleFileParams,
		@Query() query: WopiAccessTokenParams,
		@Req() req: Request
	): Promise<PutFileResponse> {
		this.ensureWopiEnabled();

		console.log('readable', req.readable);
		console.log('instanceof Readable', req instanceof Readable);

		const fileRecord = await this.wopiUc.putFile(query, req);
		const response = PutFileResponseFactory.buildFromFileRecord(fileRecord);

		return response;
	}
}
