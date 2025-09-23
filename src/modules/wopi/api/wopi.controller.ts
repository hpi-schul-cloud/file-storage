import { CurrentUser, ICurrentUser, JwtAuthentication } from '@infra/auth-guard';
import { ApiValidationError } from '@infra/error';
import {
	BadRequestException,
	ConflictException,
	Controller,
	ForbiddenException,
	Get,
	HttpCode,
	InternalServerErrorException,
	NotFoundException,
	Param,
	PayloadTooLargeException,
	Post,
	Query,
	Req,
	StreamableFile,
	UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import {
	AuthorizedCollaboraDocumentUrlParams,
	AuthorizedCollaboraDocumentUrlResponse,
	PutFileResponse,
	SingleFileParams,
	WopiAccessTokenParams,
	WopiFileInfoResponse,
} from './dto';
import { PutFileResponseFactory } from './factory';
import { StreamableFileMapper, WopiErrorResponseMapper } from './mapper';
import { WopiUc } from './wopi.uc';

@ApiTags('wopi')
@Controller('wopi')
export class WopiController {
	constructor(private readonly wopiUc: WopiUc) {}

	@ApiOperation({ summary: 'Get Collabora access URL with permission check and access token creation' })
	@ApiResponse({ status: 200, type: AuthorizedCollaboraDocumentUrlResponse })
	@ApiResponse({ status: 400, type: ApiValidationError })
	@ApiResponse({ status: 400, type: BadRequestException })
	@ApiResponse({ status: 403, type: ForbiddenException })
	@ApiResponse({ status: 404, type: NotFoundException })
	@ApiResponse({ status: 500, type: InternalServerErrorException })
	@Get('authorized-collabora-document-url')
	@JwtAuthentication()
	public async getAuthorizedCollaboraDocumentUrl(
		@Query() query: AuthorizedCollaboraDocumentUrlParams,
		@CurrentUser() currentUser: ICurrentUser
	): Promise<AuthorizedCollaboraDocumentUrlResponse> {
		const result = await this.wopiUc.getAuthorizedCollaboraDocumentUrl(currentUser.userId, query);

		return result;
	}

	@ApiOperation({ summary: 'WOPI CheckFileInfo' })
	@ApiResponse({ status: 200, type: WopiFileInfoResponse })
	@ApiResponse({ status: 400, type: BadRequestException })
	@ApiResponse({ status: 401, type: UnauthorizedException })
	@ApiResponse({ status: 404, type: NotFoundException })
	@ApiResponse({ status: 500, type: InternalServerErrorException })
	@Get('files/:fileRecordId')
	public async checkFileInfo(
		@Param() params: SingleFileParams,
		@Query() query: WopiAccessTokenParams
	): Promise<WopiFileInfoResponse> {
		try {
			const response = await this.wopiUc.checkFileInfo(query);

			return response;
		} catch (error) {
			const wopiError = WopiErrorResponseMapper.mapErrorToWopiError(error);

			throw wopiError;
		}
	}

	@ApiOperation({ summary: 'WOPI GetFile (download file contents)' })
	@ApiResponse({ status: 200, description: 'Returns the file contents as a stream.' })
	@ApiResponse({ status: 400, type: BadRequestException })
	@ApiResponse({ status: 401, type: UnauthorizedException })
	@ApiResponse({ status: 404, type: NotFoundException })
	@ApiResponse({ status: 500, type: InternalServerErrorException })
	@Get('files/:fileRecordId/contents')
	public async getFile(
		@Param() params: SingleFileParams,
		@Query() query: WopiAccessTokenParams
	): Promise<StreamableFile> {
		try {
			const fileResponse = await this.wopiUc.getFileStream(query);
			const streamableFile = StreamableFileMapper.fromResponse(fileResponse);

			return streamableFile;
		} catch (error) {
			const wopiError = WopiErrorResponseMapper.mapErrorToWopiError(error);

			throw wopiError;
		}
	}

	@HttpCode(200)
	@ApiOperation({ summary: 'WOPI PutFile (update file contents)' })
	@ApiResponse({ status: 200, description: 'Updates the file contents.' })
	@ApiResponse({ status: 400, type: BadRequestException })
	@ApiResponse({ status: 401, type: UnauthorizedException })
	@ApiResponse({ status: 404, type: NotFoundException })
	@ApiResponse({ status: 409, type: ConflictException })
	@ApiResponse({ status: 413, type: PayloadTooLargeException })
	@ApiResponse({ status: 500, type: InternalServerErrorException })
	@Post('files/:fileRecordId/contents')
	public async putFile(
		@Param() params: SingleFileParams,
		@Query() query: WopiAccessTokenParams,
		@Req() req: Request
	): Promise<PutFileResponse> {
		try {
			const fileRecord = await this.wopiUc.putFile(query, req);
			const response = PutFileResponseFactory.buildFromFileRecord(fileRecord);

			return response;
		} catch (error) {
			const wopiError = WopiErrorResponseMapper.mapErrorToWopiError(error);

			throw wopiError;
		}
	}
}
