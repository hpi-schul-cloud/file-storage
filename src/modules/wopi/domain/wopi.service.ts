import { FileDtoFactory, FileRecord, FilesStorageService, GetFileResponse } from '@modules/files-storage';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EntityId } from '@shared/domain/types/entity-id';
import { Readable } from 'node:stream';
import { WOPI_CONFIG_TOKEN, WopiConfig } from '../wopi.config';

@Injectable()
export class WopiService {
	constructor(
		@Inject(WOPI_CONFIG_TOKEN) private readonly config: WopiConfig,
		private readonly filesStorageService: FilesStorageService
	) {}

	public async updateFileContents(fileRecordId: EntityId, readable: Readable): Promise<FileRecord> {
		const fileRecord = await this.filesStorageService.getFileRecord(fileRecordId);
		const file = FileDtoFactory.create(fileRecord.getName(), readable, fileRecord.mimeType);
		const updatedFileRecord = await this.filesStorageService.updateFileContents(fileRecord, file);

		return updatedFileRecord;
	}

	public async getFile(fileRecordId: EntityId): Promise<GetFileResponse> {
		const fileRecord = await this.getFileRecord(fileRecordId);
		const fileResponse = await this.filesStorageService.downloadFile(fileRecord);

		return fileResponse;
	}

	public async getFileRecord(fileRecordId: EntityId): Promise<FileRecord> {
		const fileRecord = await this.filesStorageService.getFileRecord(fileRecordId);
		this.throwIfNotCollaboraEditable(fileRecord);

		return fileRecord;
	}

	public throwIfNotCollaboraEditable(fileRecord: FileRecord): void {
		const isCollaboraEditable = fileRecord.isCollaboraEditable(this.config.collaboraMaxFileSizeInBytes);

		if (!isCollaboraEditable) {
			throw new NotFoundException(
				'File blocked due to suspected virus, mimetype not collabora compatible or file size exceeds limit.'
			);
		}
	}
}
