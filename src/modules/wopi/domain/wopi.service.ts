import { FileRecord, FilesStorageService, GetFileResponse } from '@modules/files-storage';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { WopiConfig } from '../wopi.config';
import { WopiPayload } from './vo';

@Injectable()
export class WopiService {
	constructor(
		private readonly config: WopiConfig,
		private readonly filesStorageService: FilesStorageService
	) {}

	public async updateFileContents(wopiPayload: WopiPayload, readable: Readable): Promise<FileRecord> {
		const fileRecord = await this.filesStorageService.getFileRecord(wopiPayload.fileRecordId);
		const updatedFileRecord = await this.filesStorageService.updateFileContents(fileRecord, readable);

		return updatedFileRecord;
	}

	public async getFile(wopiPayload: WopiPayload): Promise<GetFileResponse> {
		const fileRecord = await this.filesStorageService.getFileRecord(wopiPayload.fileRecordId);
		this.throwIfNotCollaboraEditable(fileRecord);
		const fileResponse = await this.filesStorageService.downloadFile(fileRecord);

		return fileResponse;
	}

	public async getFileRecord(fileRecordId: string): Promise<FileRecord> {
		const fileRecord = await this.filesStorageService.getFileRecord(fileRecordId);
		this.throwIfNotCollaboraEditable(fileRecord);

		return fileRecord;
	}

	public throwIfNotCollaboraEditable(fileRecord: FileRecord): void {
		const isCollaboraEditable = fileRecord.isCollaboraEditable(this.config.COLLABORA_MAX_FILE_SIZE_IN_BYTES);

		if (!isCollaboraEditable) {
			throw new NotFoundException(
				'File blocked due to suspected virus, mimetype not collabora compatible or file size exceeds limit.'
			);
		}
	}
}
