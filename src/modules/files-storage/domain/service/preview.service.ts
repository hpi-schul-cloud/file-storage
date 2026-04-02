import { Logger } from '@infra/logger';
import { PreviewProducer } from '@infra/preview-generator';
import { S3ClientAdapter } from '@infra/s3-client';
import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { FILES_STORAGE_S3_CONNECTION } from '../../files-storage.config';
import { ErrorType } from '../error';
import { FileRecord, PreviewStatus } from '../file-record.do';
import { FILE_RECORD_PATH_BUILDER, FileRecordPathBuilder, GetFileResponse, PreviewFileParams } from '../interface';
import { FileStorageActionsLoggable } from '../loggable';
import { FileResponseFactory, PreviewFileOptionsMapper } from '../mapper';

@Injectable()
export class PreviewService {
	constructor(
		@Inject(FILES_STORAGE_S3_CONNECTION) private readonly storageClient: S3ClientAdapter,
		private readonly logger: Logger,
		private readonly previewProducer: PreviewProducer,
		@Inject(FILE_RECORD_PATH_BUILDER) private readonly pathBuilder: FileRecordPathBuilder
	) {
		this.logger.setContext(PreviewService.name);
	}

	public async download(fileRecord: FileRecord, previewFileParams: PreviewFileParams): Promise<GetFileResponse> {
		this.checkIfPreviewPossible(fileRecord);

		const response = await this.tryGetPreviewOrGenerate(previewFileParams);

		return response;
	}

	public async deletePreviews(fileRecords: FileRecord[]): Promise<void> {
		const paths = fileRecords.map((fileRecord) => this.pathBuilder.buildPreviewDirectoryPath(fileRecord));
		const promises = paths.map((path) => this.storageClient.deleteDirectory(path));
		await Promise.all(promises);
	}

	private checkIfPreviewPossible(fileRecord: FileRecord): void | UnprocessableEntityException {
		if (fileRecord.getPreviewStatus() !== PreviewStatus.PREVIEW_POSSIBLE) {
			this.logger.warning(
				new FileStorageActionsLoggable(`could not generate preview for mime type: ${fileRecord.mimeType}`, {
					action: 'checkIfPreviewPossible',
					sourcePayload: fileRecord,
				})
			);
			throw new UnprocessableEntityException(ErrorType.PREVIEW_NOT_POSSIBLE);
		}
	}

	private async tryGetPreviewOrGenerate(params: PreviewFileParams): Promise<GetFileResponse> {
		let file: GetFileResponse;

		try {
			if (params.previewParams.forceUpdate) {
				await this.generatePreview(params);
			}

			file = await this.getPreviewFile(params);
		} catch (error) {
			if (!(error instanceof NotFoundException)) {
				throw error;
			}

			await this.generatePreview(params);
			file = await this.getPreviewFile(params);
		}

		return file;
	}

	private async getPreviewFile(params: PreviewFileParams): Promise<GetFileResponse> {
		const { fileRecord, bytesRange, previewParams } = params;
		const previewFilePath = this.pathBuilder.buildPreviewFilePath(fileRecord, params.hash);
		const name = fileRecord.getPreviewName(previewParams.outputFormat);
		const file = await this.storageClient.get(previewFilePath, bytesRange);

		const response = FileResponseFactory.create(file, name);

		return response;
	}

	private async generatePreview(params: PreviewFileParams): Promise<void> {
		const originFilePath = this.pathBuilder.buildOriginPath(params.fileRecord);
		const previewFilePath = this.pathBuilder.buildPreviewFilePath(params.fileRecord, params.hash);
		const payload = PreviewFileOptionsMapper.fromPreviewFileParams(params, originFilePath, previewFilePath);

		await this.previewProducer.generate(payload);
	}
}
