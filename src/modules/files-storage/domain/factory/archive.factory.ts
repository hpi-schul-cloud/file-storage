import { Logger } from '@infra/logger';
import { InternalServerErrorException } from '@nestjs/common';
import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { FileRecord } from '../file-record.do';
import { GetFileResponse } from '../interface';
import { FileStorageActionsLoggable } from '../loggable';

export class ArchiveFactory {
	public static createArchive(
		files: GetFileResponse[],
		fileRecords: FileRecord[],
		logger: Logger,
		archiveType: archiver.Format = 'zip'
	): archiver.Archiver {
		const archive = archiver(archiveType);

		archive.on('warning', (err) => {
			if (err.code === 'ENOENT') {
				logger.warning(
					new FileStorageActionsLoggable('Warning while creating archive', {
						action: 'createArchive',
						sourcePayload: fileRecords,
					})
				);
			} else {
				throw new InternalServerErrorException('Error while creating archive on warning event', { cause: err });
			}
		});

		archive.on('error', (err) => {
			throw new InternalServerErrorException('Error while creating archive', { cause: err });
		});

		archive.on('close', () => {
			logger.debug(
				new FileStorageActionsLoggable(`Archive created with ${archive.pointer()} total bytes`, {
					action: 'createArchive',
					sourcePayload: fileRecords,
				})
			);
		});

		for (const file of files) {
			const passthrough = new PassThrough();
			file.data.pipe(passthrough);
			archive.append(passthrough, { name: file.name });
		}
		archive.finalize();

		return archive;
	}
}
