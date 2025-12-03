import { LogMessage, Loggable } from '@infra/logger';
import { EntityId } from '@shared/domain/types';
import { FileRecord, ParentInfo } from '../file-record.do';

interface FileStorageActionsLoggableParams {
	action: string;
	sourcePayload?: FileRecord | FileRecord[];
	targetPayload?: ParentInfo;
}

export class FileStorageActionsLoggable implements Loggable {
	constructor(
		private readonly message: string,
		private readonly payload: FileStorageActionsLoggableParams
	) {}

	public getLogMessage(): LogMessage {
		return {
			message: this.message,
			data: {
				action: this.payload.action,
				fileRecordIds: JSON.stringify(this.fileRecordId),
				sourcePayload: JSON.stringify(this.sanitizedSourcePayload),
			},
		};
	}

	private get fileRecordId(): EntityId | EntityId[] | undefined {
		const sourcePayload = this.payload.sourcePayload ?? [];
		if (Array.isArray(sourcePayload)) {
			return sourcePayload.map((sourcePayload) => sourcePayload.id);
		}

		return sourcePayload.id;
	}

	private get sanitizedSourcePayload(): unknown {
		const sourcePayload = this.payload.sourcePayload ?? [];

		if (Array.isArray(sourcePayload)) {
			return sourcePayload.map((fileRecord) => this.sanitizeFileRecord(fileRecord));
		}

		return this.sanitizeFileRecord(sourcePayload);
	}

	private sanitizeFileRecord(fileRecord: FileRecord): Record<string, unknown> {
		const props = fileRecord.getProps();

		return {
			id: props.id,
			size: props.size,
			mimeType: props.mimeType,
			parentType: props.parentType,
			parentId: props.parentId,
			creatorId: props.creatorId,
			storageLocation: props.storageLocation,
			storageLocationId: props.storageLocationId,
			deletedSince: props.deletedSince,
			isUploading: props.isUploading,
			previewGenerationFailed: props.previewGenerationFailed,
			createdAt: props.createdAt,
			updatedAt: props.updatedAt,
			contentLastModifiedAt: props.contentLastModifiedAt,
			// Explicitly exclude: name (filename)
		};
	}
}
