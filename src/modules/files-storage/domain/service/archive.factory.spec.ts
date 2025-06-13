import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { PassThrough } from 'stream';
import { FileRecord } from '../file-record.do';
import { FileStorageActionsLoggable } from '../loggable';
import { ArchiveFactory } from './archive.factory';

describe('ArchiveFactory', () => {
	let logger: DeepMocked<Logger>;
	let domainErrorHandler: DeepMocked<DomainErrorHandler>;

	beforeEach(() => {
		logger = createMock<Logger>();
		domainErrorHandler = createMock<DomainErrorHandler>();
	});

	const createFileResponse = (name: string, content: string) => {
		const stream = new PassThrough();
		stream.end(content);

		return { name, data: stream };
	};

	it('should create a zip archive and append files', (done) => {
		const files = [createFileResponse('file1.txt', 'hello'), createFileResponse('file2.txt', 'world')];
		const fileRecords: FileRecord[] = [];

		const archive = ArchiveFactory.createArchive(files, fileRecords, logger, domainErrorHandler, 'zip');

		const chunks: Buffer[] = [];
		archive.on('data', (chunk) => chunks.push(chunk));
		archive.on('close', () => {
			expect(Buffer.concat(chunks).length).toBeGreaterThan(0);
			expect(logger.debug).toHaveBeenCalled();
			done();
		});
		archive.on('error', (err) => done(err));
	});

	it('should call logger.warning on ENOENT warning', () => {
		const files = [createFileResponse('file.txt', 'test')];
		const fileRecords: FileRecord[] = [];

		const archive = ArchiveFactory.createArchive(files, fileRecords, logger, domainErrorHandler, 'zip');

		const warning = { code: 'ENOENT' };
		archive.emit('warning', warning);

		expect(logger.warning).toHaveBeenCalledWith(expect.any(FileStorageActionsLoggable));
	});

	it('should call domainErrorHandler.exec on non-ENOENT warning', () => {
		const files = [createFileResponse('file.txt', 'test')];
		const fileRecords: FileRecord[] = [];

		const archive = ArchiveFactory.createArchive(files, fileRecords, logger, domainErrorHandler, 'zip');

		const warning = { code: 'OTHER', message: 'Some error' };
		archive.emit('warning', warning);

		expect(domainErrorHandler.exec).toHaveBeenCalled();
	});

	it('should throw on error event', () => {
		const files = [createFileResponse('file.txt', 'test')];
		const fileRecords: FileRecord[] = [];

		const archive = ArchiveFactory.createArchive(files, fileRecords, logger, domainErrorHandler, 'zip');

		expect(() => {
			archive.emit('error', new Error('archive error'));
		}).toThrow('Error while creating archive');
	});
});
