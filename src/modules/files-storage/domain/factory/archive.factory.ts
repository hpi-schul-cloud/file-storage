import { Logger } from '@infra/logger';
import archiver from 'archiver';
import { FileRecord } from '../file-record.do';
import { GetFileResponse } from '../interface';
import { CreateArchiveLoggable } from '../loggable';

export class ArchiveFactory {
	public static create(
		fileResponses: GetFileResponse[],
		fileRecords: FileRecord[],
		logger: Logger,
		archiveType: archiver.Format = 'zip'
	): archiver.Archiver {
		const archive = this.createEmpty(fileRecords, logger, archiveType);

		for (const fileResponse of fileResponses) {
			this.appendFile(archive, fileResponse);
		}

		archive.finalize();

		return archive;
	}

	public static createEmpty(
		fileRecords: FileRecord[],
		logger: Logger,
		archiveType: archiver.Format = 'zip'
	): archiver.Archiver {
		const archive = archiver(archiveType);

		archive.on('warning', (err) => {
			if (err.code === 'ENOENT') {
				this.logWarning(fileRecords, logger);
			} else {
				logger.warning(new CreateArchiveLoggable('Warning while creating archive', 'createArchive', fileRecords, err));
			}
		});

		archive.on('error', (err) => {
			logger.warning(new CreateArchiveLoggable('Error while creating archive', 'createArchive', fileRecords, err));
			if (!archive.destroyed) {
				archive.destroy(err);
			}
		});

		archive.on('close', () => {
			this.logClose(fileRecords, logger);
		});

		return archive;
	}

	public static appendFile(archive: archiver.Archiver, fileResponse: GetFileResponse): void {
		fileResponse.data.on('error', (err: unknown) => {
			archive.emit('error', err as Error);
		});
		archive.append(fileResponse.data, { name: fileResponse.name });
	}

	private static logWarning(fileRecords: FileRecord[], logger: Logger): void {
		logger.warning(new CreateArchiveLoggable('Warning while creating archive', 'createArchive', fileRecords));
	}

	private static logClose(fileRecords: FileRecord[], logger: Logger): void {
		logger.debug(new CreateArchiveLoggable('Archive created', 'createArchive', fileRecords));
	}
}
