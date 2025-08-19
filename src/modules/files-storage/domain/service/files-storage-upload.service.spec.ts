import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { S3ClientAdapter } from '@infra/s3-client';
import { ObjectId } from '@mikro-orm/mongodb';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReadableStreamWithFileType } from 'file-type';
import { PassThrough, Readable } from 'stream';
import { FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from '../../files-storage.config';
import {
	fileDtoTestFactory,
	FileRecordParamsTestFactory,
	fileRecordTestFactory,
	readableStreamWithFileTypeFactory,
} from '../../testing';
import { FileDto } from '../dto';
import { ErrorType } from '../error';
import { FileRecordFactory } from '../factory';
import { FileRecord } from '../file-record.do';
import { FILE_RECORD_REPO, FileRecordRepo } from '../interface';
import { FileRecordSecurityCheck, ScanStatus } from '../vo';
import FileType from './file-type.helper';
import { FilesStorageService } from './files-storage.service';

jest.mock('./file-type.helper');

describe('FilesStorageService upload methods', () => {
	let module: TestingModule;
	let service: FilesStorageService;
	let fileRecordRepo: DeepMocked<FileRecordRepo>;
	let storageClient: DeepMocked<S3ClientAdapter>;
	let antivirusService: DeepMocked<AntivirusService>;
	let config: DeepMocked<FileStorageConfig>;

	beforeEach(async () => {
		module = await Test.createTestingModule({
			providers: [
				FilesStorageService,
				{
					provide: FILES_STORAGE_S3_CONNECTION,
					useValue: createMock<S3ClientAdapter>(),
				},
				{
					provide: FILE_RECORD_REPO,
					useValue: createMock<FileRecordRepo>(),
				},
				{
					provide: Logger,
					useValue: createMock<Logger>(),
				},
				{
					provide: AntivirusService,
					useValue: createMock<AntivirusService>(),
				},
				{
					provide: FileStorageConfig,
					useValue: createMock<FileStorageConfig>({
						FILES_STORAGE_MAX_FILE_SIZE: 10,
						FILES_STORAGE_MAX_SECURITY_CHECK_FILE_SIZE: 10,
						FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS: false,
					}),
				},
				{
					provide: DomainErrorHandler,
					useValue: createMock<DomainErrorHandler>(),
				},
			],
		}).compile();

		service = module.get(FilesStorageService);
		storageClient = module.get(FILES_STORAGE_S3_CONNECTION);
		fileRecordRepo = module.get(FILE_RECORD_REPO);
		antivirusService = module.get(AntivirusService);
		config = module.get(FileStorageConfig);
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.resetAllMocks();
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await module.close();
	});

	it('service should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('uploadFile is called', () => {
		const createUploadFileParams = (props: { mimeType: string } = { mimeType: 'dto-mime-type' }) => {
			const { parentInfo: params, fileRecords, parentId: userId } = FileRecordParamsTestFactory.build();

			const file = createMock<FileDto>();
			const readable = Readable.from('abc');
			file.data = readable;
			file.name = fileRecords[0].getName();
			file.mimeType = props.mimeType;

			const fileSize = 3;

			const fileRecord = FileRecordFactory.buildFromExternalInput(file.name, file.mimeType, params, userId);
			const expectedFileRecord = fileRecord.getProps();
			expectedFileRecord.name = FileRecord.resolveFileNameDuplicates(fileRecords, fileRecord.getName());
			const detectedMimeType = 'image/tiff';
			expectedFileRecord.mimeType = detectedMimeType;

			const expectedSecurityCheck = new FileRecordSecurityCheck({
				reason: 'No scan result',
				requestToken: undefined,
				status: ScanStatus.ERROR,
				updatedAt: new Date(),
			});

			const readableStreamWithFileType = readableStreamWithFileTypeFactory.build();

			antivirusService.checkStream.mockResolvedValueOnce({
				virus_detected: undefined,
				virus_signature: undefined,
				error: undefined,
			});

			return {
				params,
				file,
				fileSize,
				userId,
				fileRecord,
				expectedFileRecord,
				expectedSecurityCheck,
				fileRecords,
				readableStreamWithFileType,
			};
		};

		describe('WHEN file records of parent, file record repo save and get mime type are successfull', () => {
			const setup = () => {
				const {
					params,
					file,
					fileSize,
					userId,
					fileRecord,
					expectedFileRecord,
					expectedSecurityCheck,
					readableStreamWithFileType,
				} = createUploadFileParams();

				const getFileRecordsOfParentSpy = jest
					.spyOn(service, 'getFileRecordsOfParent')
					.mockResolvedValue([[fileRecord], 1]);

				const getMimeTypeSpy = jest.spyOn(FileType, 'fileTypeStream').mockResolvedValueOnce(readableStreamWithFileType);

				// The fileRecord.id must be set by fileRecordRepo.save. Otherwise createPath fails.
				fileRecordRepo.save.mockImplementation((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					return Promise.resolve();
				});

				return {
					params,
					file,
					userId,
					getFileRecordsOfParentSpy,
					getMimeTypeSpy,
					fileSize,
					readableStreamWithFileType,
					expectedFileRecord,
					expectedSecurityCheck,
				};
			};

			it('should call getMimeType with correct params', async () => {
				const { params, file, userId, getMimeTypeSpy } = setup();

				await service.uploadFile(userId, params, file);

				expect(getMimeTypeSpy).toHaveBeenCalledWith(expect.any(PassThrough));
			});

			it('should call getFileRecordsOfParent with correct params', async () => {
				const { params, file, userId, getFileRecordsOfParentSpy } = setup();

				await service.uploadFile(userId, params, file);

				expect(getFileRecordsOfParentSpy).toHaveBeenCalledWith(params.parentId);
			});

			it('should call fileRecordRepo.save in first call with isUploading: true', async () => {
				const { params, file, userId } = setup();

				// haveBeenCalledWith can't be use here because fileRecord is a reference and
				// it will always compare the final state of the object
				let param: FileRecord | undefined;

				fileRecordRepo.save.mockReset();
				fileRecordRepo.save.mockImplementationOnce((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					param = JSON.parse(JSON.stringify(fr)) as FileRecord;

					return Promise.resolve();
				});

				fileRecordRepo.save.mockImplementationOnce((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					return Promise.resolve();
				});

				await service.uploadFile(userId, params, file);

				expect(param).toMatchObject({ props: { isUploading: true } });
			});

			it('should call fileRecordRepo.save twice with correct params', async () => {
				const {
					params,
					file,
					fileSize,
					userId,
					readableStreamWithFileType,
					expectedFileRecord,
					expectedSecurityCheck,
				} = setup();

				jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', true);

				const result = await service.uploadFile(userId, params, file);
				expectedFileRecord.id = result.id;

				expect(fileRecordRepo.save).toHaveBeenCalledTimes(2);

				expect(fileRecordRepo.save).toHaveBeenLastCalledWith(
					expect.objectContaining({
						props: {
							...expectedFileRecord,
							mimeType: readableStreamWithFileType.fileType?.mime,
							size: fileSize,
							isUploading: undefined,
							createdAt: expect.any(Date),
							updatedAt: expect.any(Date),
							contentLastModifiedAt: expect.any(Date),
						},
						securityCheck: {
							...expectedSecurityCheck,
							updatedAt: expect.any(Date),
						},
					})
				);
			});

			it('should call storageClient.create with correct params', async () => {
				const { params, file, userId } = setup();

				const fileRecord = await service.uploadFile(userId, params, file);
				const parentInfo = fileRecord.getParentInfo();

				const filePath = [parentInfo.storageLocationId, fileRecord.id].join('/');
				expect(storageClient.create).toHaveBeenCalledWith(filePath, file);
			});

			it('should return an instance of FileRecord', async () => {
				const { params, file, userId } = setup();

				const result = await service.uploadFile(userId, params, file);

				expect(result).toBeInstanceOf(FileRecord);
			});

			describe('Antivirus handling by upload ', () => {
				describe('when useStreamToAntivirus is true', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const { params, file, userId } = setup();
						jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', true);

						await service.uploadFile(userId, params, file);

						expect(antivirusService.checkStream).toHaveBeenCalledWith(file);
					});
				});

				describe('when useStreamToAntivirus is false', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const { params, file, userId } = setup();
						jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', false);

						const fileRecord = await service.uploadFile(userId, params, file);

						expect(antivirusService.send).toHaveBeenCalledWith(fileRecord.getSecurityToken());
					});
				});
			});
		});

		describe('WHEN file record repo throws error', () => {
			const setup = () => {
				const { params, file, userId, fileRecord, readableStreamWithFileType } = createUploadFileParams();
				const error = new Error('test');

				jest.spyOn(service, 'getFileRecordsOfParent').mockResolvedValue([[fileRecord], 1]);

				jest.spyOn(FileType, 'fileTypeStream').mockResolvedValueOnce(readableStreamWithFileType);

				fileRecordRepo.save.mockRejectedValueOnce(error);

				return { params, file, userId, fileRecord, error };
			};

			it('should pass error and not call storageClient.create', async () => {
				const { params, file, userId, error } = setup();

				await expect(service.uploadFile(userId, params, file)).rejects.toThrow(error);
				expect(storageClient.create).toHaveBeenCalledTimes(0);
			});
		});

		describe('WHEN storageClient throws error', () => {
			const setup = () => {
				const { params, file, userId, fileRecord, readableStreamWithFileType } = createUploadFileParams();
				const error = new Error('test');

				jest.spyOn(service, 'getFileRecordsOfParent').mockResolvedValue([[fileRecord], 1]);

				jest.spyOn(FileType, 'fileTypeStream').mockResolvedValueOnce(readableStreamWithFileType);

				// The fileRecord.id must be set by fileRecordRepo.save. Otherwise createPath fails.

				fileRecordRepo.save.mockImplementation((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					return Promise.resolve();
				});

				storageClient.create.mockRejectedValueOnce(error);

				return { params, file, userId, fileRecord, error };
			};

			it('should pass error and call storageClient.delete and fileRecordRepo.delete', async () => {
				const { params, file, userId, error } = setup();

				await expect(service.uploadFile(userId, params, file)).rejects.toThrow(error);
				expect(storageClient.delete).toHaveBeenCalled();
				expect(fileRecordRepo.delete).toHaveBeenCalled();
			});
		});

		describe('WHEN file is too big', () => {
			const setup = () => {
				const { params, file, userId, fileRecord, readableStreamWithFileType } = createUploadFileParams();

				jest.spyOn(service, 'getFileRecordsOfParent').mockResolvedValue([[fileRecord], 1]);

				jest.spyOn(FileType, 'fileTypeStream').mockResolvedValueOnce(readableStreamWithFileType);

				// The fileRecord.id must be set by fileRecordRepo.save. Otherwise createPath fails.

				fileRecordRepo.save.mockImplementation((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					return Promise.resolve();
				});

				jest.replaceProperty(config, 'FILES_STORAGE_MAX_FILE_SIZE', 2);
				const error = new BadRequestException(ErrorType.FILE_TOO_BIG);

				return { params, file, userId, error };
			};

			it('should pass error and call storageClient.delete and fileRecordRepo.delete', async () => {
				const { params, file, userId, error } = setup();

				await expect(service.uploadFile(userId, params, file)).rejects.toThrow(error);
				expect(storageClient.delete).toHaveBeenCalled();
				expect(fileRecordRepo.delete).toHaveBeenCalled();
			});
		});

		describe('WHEN file size is bigger than maxSecurityCheckFileSize', () => {
			const setup = () => {
				const { params, file, userId, fileRecord, readableStreamWithFileType } = createUploadFileParams();

				jest.spyOn(service, 'getFileRecordsOfParent').mockResolvedValue([[fileRecord], 1]);

				jest.replaceProperty(config, 'FILES_STORAGE_MAX_SECURITY_CHECK_FILE_SIZE', 2);

				// The fileRecord.id must be set by fileRecordRepo.save. Otherwise createPath fails.

				fileRecordRepo.save.mockImplementation((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					return Promise.resolve();
				});

				jest.spyOn(FileType, 'fileTypeStream').mockResolvedValueOnce(readableStreamWithFileType);

				return { params, file, userId };
			};

			it('should call save with WONT_CHECK status', async () => {
				const { params, file, userId } = setup();

				await service.uploadFile(userId, params, file);

				expect(fileRecordRepo.save).toHaveBeenNthCalledWith(
					1,

					expect.objectContaining({ securityCheck: expect.objectContaining({ status: 'wont_check' }) })
				);
			});

			it('should not call antivirus send', async () => {
				const { params, file, userId } = setup();

				await service.uploadFile(userId, params, file);

				expect(antivirusService.send).not.toHaveBeenCalled();
			});
		});

		describe('WHEN antivirusService throws error', () => {
			const setup = () => {
				const { params, file, userId, fileRecord, readableStreamWithFileType } = createUploadFileParams();
				const error = new Error('test');

				jest.spyOn(service, 'getFileRecordsOfParent').mockResolvedValue([[fileRecord], 1]);

				jest.spyOn(FileType, 'fileTypeStream').mockResolvedValueOnce(readableStreamWithFileType);

				// The fileRecord.id must be set by fileRecordRepo.save. Otherwise createPath fails.

				fileRecordRepo.save.mockImplementation((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					return Promise.resolve();
				});

				antivirusService.send.mockRejectedValueOnce(error);

				return { params, file, userId, error };
			};

			it('should pass error and call storageClient.delete and fileRecordRepo.delete', async () => {
				const { params, file, userId, error } = setup();

				await expect(service.uploadFile(userId, params, file)).rejects.toThrow(error);
				expect(storageClient.delete).toHaveBeenCalled();
				expect(fileRecordRepo.delete).toHaveBeenCalled();
			});
		});

		describe('WHEN getMimeType returns undefined', () => {
			const setup = () => {
				const { params, file, userId, fileRecord } = createUploadFileParams();

				jest.spyOn(service, 'getFileRecordsOfParent').mockResolvedValue([[fileRecord], 1]);

				const readableStreamWithFileType = readableStreamWithFileTypeFactory.build({ fileType: undefined });
				jest.spyOn(FileType, 'fileTypeStream').mockResolvedValueOnce(readableStreamWithFileType);

				// The fileRecord.id must be set by fileRecordRepo.save. Otherwise createPath fails.

				fileRecordRepo.save.mockImplementation((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					return Promise.resolve();
				});

				return { params, file, userId };
			};

			it('should use dto mime type', async () => {
				const { params, file, userId } = setup();

				const fileRecord = await service.uploadFile(userId, params, file);

				expect(fileRecord.mimeType).toEqual(file.mimeType);
			});
		});

		describe('WHEN mime type cant be detected from stream', () => {
			const setup = () => {
				const mimeType = 'image/svg+xml';
				const { params, file, userId, fileRecord } = createUploadFileParams({ mimeType });

				jest.spyOn(service, 'getFileRecordsOfParent').mockResolvedValue([[fileRecord], 1]);

				const getMimeTypeSpy = jest.spyOn(FileType, 'fileTypeStream');

				// The fileRecord.id must be set by fileRecordRepo.save. Otherwise createPath fails.

				fileRecordRepo.save.mockImplementation((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					return Promise.resolve();
				});

				return { params, file, userId, getMimeTypeSpy, mimeType };
			};

			it('should use dto mime type', async () => {
				const { params, file, userId, mimeType } = setup();

				await service.uploadFile(userId, params, file);

				expect(fileRecordRepo.save).toHaveBeenCalledWith(expect.objectContaining({ mimeType }));
			});

			it('should not detect from stream', async () => {
				const { params, file, userId, getMimeTypeSpy } = setup();

				await service.uploadFile(userId, params, file);

				expect(getMimeTypeSpy).not.toHaveBeenCalled();
			});
		});

		describe('WHEN stream emits error', () => {
			const setup = () => {
				const { parentInfo: params, fileRecords, parentId: userId } = FileRecordParamsTestFactory.build();

				const file = fileDtoTestFactory().build();

				const fileSize = 3;

				const fileRecord = FileRecordFactory.buildFromExternalInput(file.name, file.mimeType, params, userId);
				const expectedFileRecord = fileRecord.getProps();
				expectedFileRecord.name = FileRecord.resolveFileNameDuplicates(fileRecords, fileRecord.getName());
				const detectedMimeType = 'image/tiff';
				expectedFileRecord.mimeType = detectedMimeType;

				const expectedSecurityCheck = new FileRecordSecurityCheck({
					reason: 'No scan result',
					requestToken: undefined,
					status: ScanStatus.ERROR,
					updatedAt: new Date(),
				});

				antivirusService.checkStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});

				const getFileRecordsOfParentSpy = jest
					.spyOn(service, 'getFileRecordsOfParent')
					.mockResolvedValue([[fileRecord], 1]);

				jest.spyOn(FileType, 'fileTypeStream').mockImplementationOnce((readable) => Promise.resolve(readable));

				file.data.on('data', () => {
					file.data.emit('error', new Error('Stream error'));
				});

				// The fileRecord.id must be set by fileRecordRepo.save. Otherwise createPath fails.
				fileRecordRepo.save.mockImplementation((fr) => {
					if (fr instanceof FileRecord && !fr.id) {
						const props = fr.getProps();
						props.id = new ObjectId().toHexString();
						fr = fileRecordTestFactory().build(props);
					}

					return Promise.resolve();
				});

				return {
					params,
					file,
					userId,
					getFileRecordsOfParentSpy,
					fileSize,
					expectedFileRecord,
					expectedSecurityCheck,
				};
			};

			it('should throw internal server error', async () => {
				const { params, file, userId } = setup();

				await expect(service.uploadFile(userId, params, file)).rejects.toThrow(InternalServerErrorException);
			});
		});
	});

	describe('updateFileContents is called', () => {
		describe('WHEN update is successfull', () => {
			const setup = (mimeTypeProp?: string) => {
				const mimeType = 'image/png';
				const fileRecord = fileRecordTestFactory().build({ mimeType: mimeTypeProp ?? mimeType });
				const fileDto = fileDtoTestFactory().build({
					name: fileRecord.getName(),
					mimeType: fileRecord.getMimeType(),
				});
				const mimeTypeSpy = jest
					.spyOn(FileType, 'fileTypeStream')
					.mockImplementationOnce((readable) => Promise.resolve(readable));

				antivirusService.checkStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});

				return {
					mimeTypeSpy,
					fileDto,
					fileRecord,
					mimeType,
				};
			};

			it('should call getMimeType with correct params', async () => {
				const { fileRecord, fileDto, mimeTypeSpy } = setup();

				await service.updateFileContents(fileRecord, fileDto);

				expect(mimeTypeSpy).toHaveBeenCalledWith(expect.any(PassThrough));
			});

			it('should call fileRecordRepo.save ', async () => {
				const { mimeType, fileRecord, fileDto } = setup();

				await service.updateFileContents(fileRecord, fileDto);

				const expectedFileRecord = fileRecord.getProps();
				const expectedSecurityCheck = fileRecord.getSecurityCheckProps();

				expect(fileRecordRepo.save).toHaveBeenLastCalledWith(
					expect.objectContaining({
						props: {
							...expectedFileRecord,
							mimeType: mimeType,
							size: 3,
							isUploading: undefined,
							createdAt: expect.any(Date),
							updatedAt: expect.any(Date),
							contentLastModifiedAt: expect.any(Date),
						},
						securityCheck: {
							...expectedSecurityCheck,
							updatedAt: expect.any(Date),
						},
					})
				);
			});

			it('should call storageClient.create with correct params', async () => {
				const { fileRecord, fileDto } = setup();

				await service.updateFileContents(fileRecord, fileDto);
				const parentInfo = fileRecord.getParentInfo();

				const filePath = [parentInfo.storageLocationId, fileRecord.id].join('/');
				expect(storageClient.create).toHaveBeenCalledWith(filePath, fileDto);
			});

			it('should return an instance of FileRecord', async () => {
				const { fileRecord, fileDto } = setup();

				const result = await service.updateFileContents(fileRecord, fileDto);

				expect(result).toMatchObject({
					...fileRecord,
				});
			});

			describe('Antivirus handling by upload ', () => {
				describe('when useStreamToAntivirus is true, fileRecord is previewable and has not a collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const { fileRecord, fileDto } = setup('image/png');
						jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', true);

						await service.updateFileContents(fileRecord, fileDto);

						expect(antivirusService.checkStream).toHaveBeenCalledWith(expect.any(PassThrough));
					});
				});

				describe('when useStreamToAntivirus is true, fileRecord is not previewable and has collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const { fileRecord, fileDto } = setup('text/plain');
						jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', true);

						await service.updateFileContents(fileRecord, fileDto);

						expect(antivirusService.checkStream).toHaveBeenCalledWith(expect.any(PassThrough));
					});
				});

				describe('when useStreamToAntivirus is true and fileRecord is not previewable and has no collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const { fileRecord, fileDto } = setup('audio/aac');
						jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', true);

						await service.updateFileContents(fileRecord, fileDto);

						expect(antivirusService.send).toHaveBeenCalledWith(fileRecord.getSecurityToken());
					});
				});

				describe('when useStreamToAntivirus is false and fileRecord is previewable and has no collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const { fileRecord, fileDto } = setup('image/png');
						jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', false);

						await service.updateFileContents(fileRecord, fileDto);

						expect(antivirusService.send).toHaveBeenCalledWith(fileRecord.getSecurityToken());
					});
				});

				describe('when useStreamToAntivirus is false and fileRecord is not previewable and has collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const { fileRecord, fileDto } = setup('text/plain');
						jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', false);

						await service.updateFileContents(fileRecord, fileDto);

						expect(antivirusService.send).toHaveBeenCalledWith(fileRecord.getSecurityToken());
					});
				});
			});
		});

		describe('WHEN storageClient throws error', () => {
			describe('when useStreamToAntivirus is true', () => {
				const setup = () => {
					jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', true);

					const mimeType = 'image/png';
					const fileRecord = fileRecordTestFactory().build({ mimeType });
					const fileDto = fileDtoTestFactory().build({
						name: fileRecord.getName(),
						mimeType,
					});
					jest.spyOn(FileType, 'fileTypeStream').mockImplementationOnce((readable) => Promise.resolve(readable));

					const error = new Error('test');
					storageClient.create.mockRejectedValueOnce(error);

					return {
						error,
						fileDto,
						fileRecord,
					};
				};

				it('should pass error', async () => {
					const { fileDto, fileRecord, error } = setup();

					await expect(service.updateFileContents(fileRecord, fileDto)).rejects.toThrow(error);
				});
			});

			describe('when useStreamToAntivirus is false', () => {
				const setup = () => {
					jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', false);

					const mimeType = 'image/png';
					const fileRecord = fileRecordTestFactory().build({ mimeType });
					const fileDTO = fileDtoTestFactory().build({
						name: fileRecord.getName(),
						mimeType,
					});
					jest.spyOn(FileType, 'fileTypeStream').mockImplementationOnce((readable) => Promise.resolve(readable));

					const error = new Error('test');
					storageClient.create.mockRejectedValueOnce(error);

					antivirusService.checkStream.mockResolvedValueOnce({
						virus_detected: undefined,
						virus_signature: undefined,
						error: undefined,
					});

					return {
						error,
						fileDTO,
						fileRecord,
					};
				};

				it('should pass error and call storageClient.delete and fileRecordRepo.delete', async () => {
					const { fileDTO, fileRecord, error } = setup();

					await expect(service.updateFileContents(fileRecord, fileDTO)).rejects.toThrow(error);
				});
			});
		});

		describe('WHEN file is too big', () => {
			const setup = () => {
				jest.replaceProperty(config, 'FILES_STORAGE_MAX_FILE_SIZE', 0);

				const mimeType = 'image/png';
				const fileRecord = fileRecordTestFactory().build({ mimeType });
				const fileDto = fileDtoTestFactory().build({
					name: fileRecord.getName(),
					mimeType,
				});
				const mimeTypeSpy = jest
					.spyOn(FileType, 'fileTypeStream')
					.mockImplementationOnce((readable) => Promise.resolve(readable));

				return {
					mimeTypeSpy,
					fileDto,
					fileRecord,
					mimeType,
				};
			};

			it('should pass error', async () => {
				const { fileDto, fileRecord } = setup();

				const expectedError = new BadRequestException(ErrorType.FILE_TOO_BIG);
				await expect(service.updateFileContents(fileRecord, fileDto)).rejects.toThrow(expectedError);
			});
		});

		describe('WHEN file size is bigger than maxSecurityCheckFileSize', () => {
			const setup = () => {
				jest.replaceProperty(config, 'FILES_STORAGE_MAX_SECURITY_CHECK_FILE_SIZE', 0);

				const mimeType = 'image/png';
				const fileRecord = fileRecordTestFactory().build({ mimeType });
				const fileDto = fileDtoTestFactory().build({
					name: fileRecord.getName(),
					mimeType,
				});
				const mimeTypeSpy = jest
					.spyOn(FileType, 'fileTypeStream')
					.mockImplementationOnce((readable) => Promise.resolve(readable));

				return {
					mimeTypeSpy,
					fileDto,
					fileRecord,
					mimeType,
				};
			};

			it('should call save with WONT_CHECK status', async () => {
				const { fileDto, fileRecord } = setup();

				await service.updateFileContents(fileRecord, fileDto);

				expect(fileRecordRepo.save).toHaveBeenNthCalledWith(
					1,

					expect.objectContaining({ securityCheck: expect.objectContaining({ status: 'wont_check' }) })
				);
			});

			it('should not call antivirus send', async () => {
				const { fileDto, fileRecord } = setup();

				await service.updateFileContents(fileRecord, fileDto);

				expect(antivirusService.send).not.toHaveBeenCalled();
			});
		});

		describe('WHEN antivirusService throws error', () => {
			describe('when useStreamToAntivirus is true', () => {
				const setup = () => {
					jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', true);
					const mimeType = 'image/png';
					const fileRecord = fileRecordTestFactory().build({ mimeType });
					const fileDto = fileDtoTestFactory().build({
						name: fileRecord.getName(),
						mimeType,
					});
					jest.spyOn(FileType, 'fileTypeStream').mockImplementationOnce((readable) => Promise.resolve(readable));

					const error = new Error('test');
					antivirusService.checkStream.mockRejectedValueOnce(error);

					return {
						fileDto,
						fileRecord,
						error,
					};
				};

				it('should pass error', async () => {
					const { fileDto, fileRecord, error } = setup();

					await expect(service.updateFileContents(fileRecord, fileDto)).rejects.toThrow(error);
				});
			});

			describe('when useStreamToAntivirus is false', () => {
				const setup = () => {
					jest.replaceProperty(config, 'FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS', false);
					const mimeType = 'image/png';
					const fileRecord = fileRecordTestFactory().build({ mimeType });
					const fileDto = fileDtoTestFactory().build({
						name: fileRecord.getName(),
						mimeType,
					});
					jest.spyOn(FileType, 'fileTypeStream').mockImplementationOnce((readable) => Promise.resolve(readable));

					const error = new Error('test');
					antivirusService.send.mockRejectedValueOnce(error);

					return {
						fileDto,
						fileRecord,
						error,
					};
				};

				it('should pass error', async () => {
					const { fileDto, fileRecord, error } = setup();

					await expect(service.updateFileContents(fileRecord, fileDto)).rejects.toThrow(error);
				});
			});
		});

		describe('WHEN getMimeType returns different mime type than original', () => {
			const setup = () => {
				const mimeType = 'image/png';
				const fileRecord = fileRecordTestFactory().build({ mimeType });
				const fileDto = fileDtoTestFactory().build({
					name: fileRecord.getName(),
					mimeType,
				});
				const mimeTypeSpy = jest
					.spyOn(FileType, 'fileTypeStream')
					.mockImplementationOnce((readable: ReadableStreamWithFileType) => {
						const result = readableStreamWithFileTypeFactory.build({ readable: readable, fileType: { mime: 'other' } });

						return Promise.resolve(result);
					});

				antivirusService.checkStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});

				return {
					mimeTypeSpy,
					fileDto,
					fileRecord,
					mimeType,
				};
			};

			it('should throw', async () => {
				const { fileDto, fileRecord } = setup();

				await expect(service.updateFileContents(fileRecord, fileDto)).rejects.toThrow(
					new BadRequestException(ErrorType.MIME_TYPE_MISMATCH)
				);
			});
		});

		describe('WHEN mime type cant be detected from stream', () => {
			const setup = () => {
				const mimeType = 'image/svg+xml';
				const fileRecord = fileRecordTestFactory().build({ mimeType });
				const fileDto = fileDtoTestFactory().build({
					name: fileRecord.getName(),
					mimeType,
				});
				const mimeTypeSpy = jest
					.spyOn(FileType, 'fileTypeStream')
					.mockImplementationOnce((readable) => Promise.resolve(readable));

				antivirusService.checkStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});

				return {
					mimeTypeSpy,
					fileDto,
					fileRecord,
					mimeType,
				};
			};

			it('should use dto mime type', async () => {
				const { fileDto, fileRecord, mimeType } = setup();

				await service.updateFileContents(fileRecord, fileDto);

				expect(fileRecordRepo.save).toHaveBeenCalledWith(expect.objectContaining({ mimeType }));
			});

			it('should not detect from stream', async () => {
				const { fileDto, fileRecord, mimeTypeSpy } = setup();

				await service.updateFileContents(fileRecord, fileDto);

				expect(mimeTypeSpy).not.toHaveBeenCalled();
			});
		});

		describe('WHEN stream emits error', () => {
			const setup = () => {
				const mimeType = 'image/png';
				const fileRecord = fileRecordTestFactory().build({ mimeType });
				const fileDto = fileDtoTestFactory().build({
					name: fileRecord.getName(),
					mimeType,
				});
				fileDto.data.on('data', () => {
					fileDto.data.emit('error', new Error('Stream error'));
				});
				jest.spyOn(FileType, 'fileTypeStream').mockImplementationOnce((readable) => Promise.resolve(readable));

				antivirusService.checkStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});

				return {
					fileDto,
					fileRecord,
				};
			};

			it('should throw InternalServerErrorException', async () => {
				const { fileRecord, fileDto } = setup();

				await expect(service.updateFileContents(fileRecord, fileDto)).rejects.toThrow(InternalServerErrorException);
			});
		});
	});
});
