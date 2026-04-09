import { Logger } from '@infra/logger';
import archiver from 'archiver';
import { FileRecord } from '../file-record.do';
import { CreateArchiveLoggable } from '../loggable';
import { GetFileResponse } from '../interface';

export class ArchiveFactory {
	public static create(
		fileResponse: GetFileResponse[],
		files: FileRecord[],
		logger: Logger,
		archiveType: archiver.Format = 'zip'
	): archiver.Archiver {
		const archive = this.createEmpty(files, logger, archiveType);

		for (const file of fileResponse) {
			this.appendFile(archive, file);
		}

		archive.finalize();

		return archive;
	}

	public static createEmpty(
		files: FileRecord[],
		logger: Logger,
		archiveType: archiver.Format = 'zip'
	): archiver.Archiver {
		const archive = archiver(archiveType);

		archive.on('warning', (err) => {
			if (err.code === 'ENOENT') {
				this.logWarning(files, logger);
			} else {
				logger.warning(new CreateArchiveLoggable('Warning while creating archive', 'createArchive', files, err));
			}
		});

		archive.on('error', (err) => {
			logger.warning(new CreateArchiveLoggable('Error while creating archive', 'createArchive', files, err));
		});

		archive.on('close', () => {
			this.logClose(files, logger);
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
