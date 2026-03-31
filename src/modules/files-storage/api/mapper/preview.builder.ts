import { EntityId } from '@shared/domain/types';
import crypto from 'crypto';
import { FileRecord, PreviewFileParams } from '../../domain';
import { FileRecordPathBuilder } from '../../repo';
import { PreviewParams } from '../dto';

export class PreviewBuilder {
	public static buildParams(
		fileRecord: FileRecord,
		previewParams: PreviewParams,
		bytesRange: string | undefined
	): PreviewFileParams {
		const { id, mimeType } = fileRecord;
		const originFilePath = FileRecordPathBuilder.build(fileRecord);
		const format = FileRecord.getFormat(previewParams.outputFormat ?? mimeType);

		const hash = PreviewBuilder.createPreviewNameHash(id, previewParams);
		const previewFilePath = fileRecord.createPreviewFilePath(hash);

		const previewFileParams = {
			fileRecord,
			previewParams,
			hash,
			previewFilePath,
			originFilePath,
			format,
			bytesRange,
		};

		return previewFileParams;
	}

	public static createPreviewNameHash(fileRecordId: EntityId, previewParams: PreviewParams): string {
		const width = previewParams.width ?? '';
		const format = previewParams.outputFormat ?? '';
		const fileParamsString = `${fileRecordId}${width}${format}`;
		const hash = crypto.createHash('md5').update(fileParamsString).digest('hex');

		return hash;
	}
}
