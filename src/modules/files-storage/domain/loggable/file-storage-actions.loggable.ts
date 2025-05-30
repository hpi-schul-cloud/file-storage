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
				sourcePayload: JSON.stringify(this.payload.sourcePayload),
			},
		};
	}

	private get fileRecordId(): EntityId | EntityId[] | undefined {
		if (this.payload.sourcePayload) {
			if (Array.isArray(this.payload.sourcePayload)) {
				return this.payload.sourcePayload.map((sourcePayload) => sourcePayload.id);
			}

			return this.payload.sourcePayload.id;
		}

		return undefined;
	}
}
