import { UnprocessableEntityException } from '@nestjs/common';
import { loadEsm } from 'load-esm';
import { Readable } from 'node:stream';
import { type ReadableStream } from 'node:stream/web';
import { FileDto } from '../dto';
import { ErrorType } from '../error';

const previewImageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export async function validatePreviewImage(sourceFile: FileDto): Promise<FileDto> {
	let imageStream: Readable | undefined;

	try {
		const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');
		const detectedStream = await fileTypeStream(Readable.toWeb(sourceFile.data));
		imageStream = Readable.fromWeb(detectedStream as ReadableStream<Uint8Array>);
		const detectedMimeType = detectedStream.fileType?.mime;
		const declaredMimeType = sourceFile.mimeType.split(';')[0].trim().toLowerCase();

		if (!detectedMimeType || !previewImageMimeTypes.has(detectedMimeType) || declaredMimeType !== detectedMimeType) {
			throw new UnprocessableEntityException(ErrorType.MIME_TYPE_MISMATCH);
		}

		return new FileDto({ ...sourceFile, data: imageStream, mimeType: detectedMimeType });
	} catch (error) {
		imageStream?.destroy();
		sourceFile.data.destroy();

		if (error instanceof UnprocessableEntityException) {
			throw error;
		}

		throw new UnprocessableEntityException(ErrorType.MIME_TYPE_MISMATCH, { cause: error });
	}
}
