import { Logger } from '@infra/logger';
import { GetFile, S3ClientAdapter } from '@infra/s3-client';
import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PassThrough } from 'stream';
import { ImageMagickAdapter } from './image-magick.adapter';
import { PreviewFileOptions, PreviewInputMimeTypes, PreviewOptions, PreviewResponseMessage } from './interface';
import { PreviewActionsLoggable } from './loggable/preview-actions.loggable';
import { PreviewNotPossibleException } from './loggable/preview-exception';
import { PreviewGeneratorBuilder } from './preview-generator.builder';

export const FILE_STORAGE_CLIENT = 'FILE_STORAGE_CLIENT';
@Injectable()
export class PreviewGeneratorService {
	constructor(
		@Inject(FILE_STORAGE_CLIENT) private readonly storageClient: S3ClientAdapter,
		private readonly logger: Logger
	) {
		this.logger.setContext(PreviewGeneratorService.name);
	}

	public async generatePreview(params: PreviewFileOptions): Promise<PreviewResponseMessage> {
		try {
			this.logger.info(new PreviewActionsLoggable('PreviewGeneratorService.generatePreview:start', params));
			const { originFilePath, previewFilePath, previewOptions } = params;

			const original = await this.downloadOriginFile(originFilePath);

			this.checkIfPreviewPossible(original, params);

			const preview = await this.resizeAndConvert(original, previewOptions);
			const file = PreviewGeneratorBuilder.buildFile(preview, params.previewOptions);

			await this.storageClient.create(previewFilePath, file);

			this.logger.info(new PreviewActionsLoggable('PreviewGeneratorService.generatePreview:end', params));

			return {
				previewFilePath,
				status: true,
			};
		} catch (error) {
			if (error instanceof UnprocessableEntityException) {
				throw new PreviewNotPossibleException(params, error);
			}

			throw error;
		}
	}

	private checkIfPreviewPossible(original: GetFile, params: PreviewFileOptions): void | UnprocessableEntityException {
		const isPreviewPossible =
			original.contentType && Object.values<string>(PreviewInputMimeTypes).includes(original.contentType);

		if (!isPreviewPossible) {
			this.logger.warning(new PreviewActionsLoggable('PreviewGeneratorService.previewNotPossible', params));
			throw new UnprocessableEntityException('Unsupported file type for preview generation');
		}
	}

	private async downloadOriginFile(pathToFile: string): Promise<GetFile> {
		const file = await this.storageClient.get(pathToFile);

		return file;
	}

	private resizeAndConvert(original: GetFile, previewParams: PreviewOptions): Promise<PassThrough> {
		const { format, width } = previewParams;

		const preview = new ImageMagickAdapter(original.data);

		if (original.contentType === PreviewInputMimeTypes.APPLICATION_PDF) {
			preview.selectFrame(0);
		}

		if (original.contentType === PreviewInputMimeTypes.IMAGE_GIF) {
			preview.coalesce();
		}

		if (width) {
			preview.resize(width, undefined, '>');
		}

		return this.convert(preview, format);
	}

	private convert(preview: ImageMagickAdapter, format: string): Promise<PassThrough> {
		const promise = new Promise<PassThrough>((resolve, reject) => {
			preview.stream(format, (err, stdout, stderr) => {
				if (err) {
					reject(new UnprocessableEntityException('Convert not possible', { cause: err }));

					return;
				}

				if (!stdout || !stderr) {
					reject(new UnprocessableEntityException('No output streams received from ImageMagick'));

					return;
				}

				const throughStream = new PassThrough();
				stdout.pipe(throughStream);
				stdout.on('data', () => {
					resolve(throughStream);
				});

				const errorChunks: Uint8Array[] = [];
				stderr.on('data', (chunk: Uint8Array) => {
					errorChunks.push(chunk);
				});

				stderr.on('end', () => {
					let errorMessage = '';
					Buffer.concat(errorChunks).forEach((chunk) => {
						errorMessage += String.fromCharCode(chunk);
					});

					reject(new UnprocessableEntityException(errorMessage));
				});
			});
		});

		return promise;
	}
}
