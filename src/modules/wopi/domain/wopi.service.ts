import { FileRecord } from '@modules/files-storage/domain';
import { Injectable, NotFoundException } from '@nestjs/common';
import { WopiConfig } from '../wopi.config';

@Injectable()
export class WopiService {
	constructor(private readonly config: WopiConfig) {}

	public checkCollaboraCompatibilityMimetype(fileRecord: FileRecord): void {
		if (!fileRecord.hasCollaboraCompatibleMimeType()) {
			throw new NotFoundException('File mimetype not collabora compatible.');
		}
	}

	public ensureWopiEnabled(): void {
		if (!this.config.FEATURE_COLUMN_BOARD_COLLABORA_ENABLED) {
			throw new NotFoundException('WOPI feature is disabled');
		}
	}

	public throwIfNotCollaboraEditable(fileRecord: FileRecord): void {
		const isCollaboraEditable = fileRecord.isCollaboraEditable(this.config.COLLABORA_MAX_FILE_SIZE_IN_BYTES);

		if (!isCollaboraEditable) {
			throw new NotFoundException(
				'File blocked due to suspected virus, mimetype not collabora compatible or file size exceeds limit'
			);
		}
	}

	public getTokenTtlInSeconds(): number {
		return this.config.WOPI_TOKEN_TTL_IN_SECONDS;
	}

	public getWopiUrl(): string {
		return this.config.WOPI_URL;
	}

	public getPostMessageOrigin(): string {
		return this.config.WOPI_POST_MESSAGE_ORIGIN;
	}
}
