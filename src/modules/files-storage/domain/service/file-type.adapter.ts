import type { ReadableStreamWithFileType } from 'file-type';
import { loadEsm } from 'load-esm';
import { Readable } from 'stream';

export class FileTypeAdapter {
	public static async detectMimeType(
		data: Readable,
		expectedMimeType: string
	): Promise<{ mimeType: string; stream: Readable }> {
		if (!FileTypeAdapter.isStreamMimeTypeDetectionPossible(expectedMimeType)) {
			return { mimeType: expectedMimeType, stream: data };
		}

		const { mime: detectedMimeType, stream } = await FileTypeAdapter.detectMimeTypeFromStream(data);
		const mimeType = FileTypeAdapter.resolveMimeType(detectedMimeType, expectedMimeType);

		return { mimeType, stream };
	}

	private static async detectMimeTypeFromStream(file: Readable): Promise<{ mime?: string; stream: Readable }> {
		const stream = await FileTypeAdapter.getFileTypeStream(file);

		return { mime: stream.fileType?.mime, stream };
	}

	private static resolveMimeType(detectedMimeType: string | undefined, expectedMimeType: string): string {
		const shouldUseDetectedMimeType = FileTypeAdapter.shouldDetectedMimeTypeBeUsed(detectedMimeType);
		const detectedMimeTypeToBeUsed = shouldUseDetectedMimeType ? detectedMimeType : undefined;
		const mimeType = detectedMimeTypeToBeUsed ?? expectedMimeType;

		return mimeType;
	}

	private static isStreamMimeTypeDetectionPossible(mimeType: string): boolean {
		const unsupportedMimeTypes = [
			'text/csv',
			'image/svg+xml',
			'application/msword',
			'application/vnd.ms-powerpoint',
			'application/vnd.ms-excel',
		];

		const result = !unsupportedMimeTypes.includes(mimeType);

		return result;
	}

	private static shouldDetectedMimeTypeBeUsed(mimeType?: string): boolean {
		if (!mimeType) return false;

		const excludedMimeTypes = ['application/x-cfb'];

		return !excludedMimeTypes.includes(mimeType);
	}

	private static async getFileTypeStream(file: Readable): Promise<ReadableStreamWithFileType> {
		const { fileTypeStream } = await loadEsm<typeof import('file-type')>('file-type');

		const stream = await fileTypeStream(file);

		return stream;
	}
}
