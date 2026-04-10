import { NotFoundException } from '@nestjs/common';
import { ArchiveFactory } from '../factory';
import { FileResponseFactory } from '../mapper';
import { FilesStorageService } from './files-storage.service';

describe('FilesStorageService.downloadFilesAsArchive', () => {
	let service: FilesStorageService;
	let logger: any;

	beforeEach(() => {
		logger = { setContext: jest.fn() };
		service = Object.create(FilesStorageService.prototype);
		// @ts-ignore
		service.logger = logger;
	});

	it('should throw NotFoundException if fileRecords is empty', () => {
		expect(() => {
			service.downloadFilesAsArchive([], 'archive.zip');
		}).toThrow(NotFoundException);
	});

	it('should create archive and return file response', async () => {
		const fileRecords = [{}];
		const archive = { destroy: jest.fn() };
		const fileResponse = {};
		jest.spyOn(ArchiveFactory, 'createEmpty').mockReturnValue(archive as any);
		// @ts-ignore
		const populateSpy = jest.spyOn(service, 'populateArchiveAndFinalize').mockResolvedValue(undefined);
		jest.spyOn(FileResponseFactory, 'createFromArchive').mockReturnValue(fileResponse as any);

		const result = service.downloadFilesAsArchive(fileRecords as any, 'archive.zip');
		expect(ArchiveFactory.createEmpty).toHaveBeenCalledWith(fileRecords, logger);
		expect(populateSpy).toHaveBeenCalledWith(archive, fileRecords);
		expect(FileResponseFactory.createFromArchive).toHaveBeenCalledWith('archive.zip', archive);
		expect(result).toBe(fileResponse);
	});
});
