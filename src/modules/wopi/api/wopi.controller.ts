import { CurrentUser, ICurrentUser, JwtAuthentication } from '@infra/auth-guard';
import { ApiValidationError } from '@infra/error';
// TODO: Nur eine Id, eine entsprechung hierfür bei wopi ablegen
import { SingleFileParams } from '@modules/files-storage/api/dto';
// TODO: scheint nicht zum FilesStorage zu gehören
import { FilesStorageMapper } from '@modules/files-storage/api/mapper';
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
import { WopiConfig } from '../wopi.config';
import {
	AuthorizedCollaboraDocumentUrlParams,
	AuthorizedCollaboraDocumentUrlResponse,
	PutFileResponse,
	WopiAccessTokenParams,
	WopiFileInfoResponse,
} from './dto';
import { PutFileResponseFactory } from './factory';
import { WopiErrorResponseMapper } from './mapper';
import { WopiUc } from './wopi.uc';

@ApiTags('wopi')
@Controller('wopi')
export class WopiController {
	constructor(
		private readonly wopiUc: WopiUc,
		private readonly config: WopiConfig
	) {}

	private ensureWopiEnabled(): void {
		if (!this.config.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED) {
			throw new NotFoundException('WOPI feature is disabled');
		}
	}

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
		this.ensureWopiEnabled();

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
		this.ensureWopiEnabled();

		try {
			const response = await this.wopiUc.checkFileInfo(params, query);

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
		this.ensureWopiEnabled();

		try {
			const fileResponse = await this.wopiUc.getFileStream(params, query);
			const streamableFile = FilesStorageMapper.mapToStreamableFile(fileResponse);

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
		this.ensureWopiEnabled();

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
