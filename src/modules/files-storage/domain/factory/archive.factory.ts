import { Logger } from '@infra/logger';
import { InternalServerErrorException } from '@nestjs/common';
import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { FileRecord } from '../file-record.do';
import { GetFileResponse } from '../interface';
import { FileStorageActionsLoggable } from '../loggable';

export class ArchiveFactory {
	public static create(
		files: GetFileResponse[],
		fileRecords: FileRecord[],
		logger?: Logger,
		archiveType: archiver.Format = 'zip'
	): archiver.Archiver {
		const archive = archiver(archiveType);

		archive.on('warning', (err) => {
			if (err.code === 'ENOENT') {
				this.logWarning(fileRecords, logger);
			} else {
				throw new InternalServerErrorException('Error while creating archive on warning event', { cause: err });
			}
		});

		archive.on('error', (err) => {
			throw new InternalServerErrorException('Error while creating archive', { cause: err });
		});

		archive.on('close', () => {
			this.logClose(fileRecords, logger);
		});

		for (const file of files) {
			const passthrough = new PassThrough();
			file.data.pipe(passthrough);
			archive.append(passthrough, { name: file.name });
		}
		archive.finalize();

		return archive;
	}

	private static logWarning(fileRecords: FileRecord[], logger?: Logger): void {
		logger?.warning(
			new FileStorageActionsLoggable('Warning while creating archive', {
				action: 'createArchive',
				sourcePayload: fileRecords,
			})
		);
	}

	private static logClose(fileRecords: FileRecord[], logger?: Logger): void {
		logger?.debug(
			new FileStorageActionsLoggable('Archive created', {
				action: 'createArchive',
				sourcePayload: fileRecords,
			})
		);
	}
}
