import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AntivirusService } from '@infra/antivirus';
import { DomainErrorHandler } from '@infra/error';
import { Logger } from '@infra/logger';
import { S3ClientAdapter } from '@infra/s3-client';
import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PassThrough, Readable } from 'node:stream';
import { FILE_STORAGE_CONFIG_TOKEN, FILES_STORAGE_S3_CONNECTION, FileStorageConfig } from '../../files-storage.config';
import { fileRecordTestFactory, ParentInfoTestFactory, passThroughFileDtoTestFactory } from '../../testing';
import { FileDto } from '../dto';
import { ErrorType } from '../error';
import { FileRecordFactory, PassThroughFileDtoFactory } from '../factory';
import { FileRecord } from '../file-record.do';
import { FILE_RECORD_REPO, FileRecordRepo } from '../interface';
import detectMimeTypeUtils from '../utils/detect-mime-type.utils';
import { FileRecordSecurityCheck, ScanStatus } from '../vo';
import { FilesStorageService } from './files-storage.service';

jest.mock('../utils/detect-mime-type.utils');

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
					provide: FILE_STORAGE_CONFIG_TOKEN,
					useValue: createMock<FileStorageConfig>({
						filesStorageMaxFileSize: 10000,
						filesStorageMaxSecurityCheckFileSize: 10000,
						filesStorageUseStreamToAntivirus: false,
						collaboraMaxFileSizeInBytes: 100,
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
		config = module.get(FILE_STORAGE_CONFIG_TOKEN);
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
		const createUploadFileParams = (mimeType?: string) => {
			const parentInfo = ParentInfoTestFactory.build();

			const fileRecords = fileRecordTestFactory().withParentInfo(parentInfo).buildList(3);
			const file = passThroughFileDtoTestFactory().asMimeType(mimeType).build({ name: fileRecords[0].getName() });
			const fileSize = 3;

			const fileRecord = FileRecordFactory.buildFromExternalInput(
				file.name,
				file.mimeType,
				parentInfo,
				parentInfo.parentId
			);
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

			antivirusService.scanStream.mockResolvedValueOnce({
				virus_detected: undefined,
				virus_signature: undefined,
				error: undefined,
			});

			return {
				params: parentInfo,
				file,
				fileSize,
				userId: parentInfo.parentId,
				fileRecord,
				expectedFileRecord,
				expectedSecurityCheck,
				fileRecords,
			};
		};

		describe('WHEN file records of parent, file record repo save and get mime type are successfull', () => {
			const setup = () => {
				const { params, file, userId, fileRecord } = createUploadFileParams('image/tiff');
				const getFileRecordsByParentSpy = jest
					.spyOn(service, 'getFileRecordsByParent')
					.mockResolvedValueOnce([[fileRecord], 1]);
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce(file.mimeType);

				fileRecordRepo.save.mockResolvedValue(Promise.resolve());

				return {
					params,
					file,
					userId,
					getFileRecordsByParentSpy,
				};
			};

			it('should call getFileRecordsByParent with correct params to resolve file name', async () => {
				const { params, file, userId, getFileRecordsByParentSpy } = setup();

				await service.uploadFile(userId, params, file);

				expect(getFileRecordsByParentSpy).toHaveBeenCalledWith(params.parentId);
			});

			it('should call fileRecordRepo.save twice with correct params', async () => {
				const { params, file, userId } = setup();

				jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', true);
				const markAsUploadingSpy = jest.spyOn(FileRecord.prototype, 'markAsUploading');
				const markAsUploadedSpy = jest.spyOn(FileRecord.prototype, 'markAsUploaded');
				const result = await service.uploadFile(userId, params, file);

				expect(fileRecordRepo.save).toHaveBeenCalledTimes(2);
				expect(fileRecordRepo.save).toHaveBeenNthCalledWith(2, result);
				expect(markAsUploadingSpy).toHaveBeenCalledTimes(1);
				expect(markAsUploadedSpy).toHaveBeenCalledTimes(1);

				markAsUploadingSpy.mockRestore();
				markAsUploadedSpy.mockRestore();
			});

			it('should call storageClient.create with correct params', async () => {
				const { params, file, userId } = setup();

				const fileRecord = await service.uploadFile(userId, params, file);

				const parentInfo = fileRecord.getParentInfo();
				const filePath = [parentInfo.storageLocationId, fileRecord.id].join('/');

				expect(storageClient.create).toHaveBeenCalledWith(
					filePath,
					expect.objectContaining({
						name: expect.stringContaining('file-record-name #0'),
						mimeType: expect.any(String),
						data: expect.anything(), // Accept any stream/data object
						streamCompletion: expect.any(Promise),
					})
				);
			});

			it('should return an instance of FileRecord', async () => {
				const { params, file, userId } = setup();

				const result = await service.uploadFile(userId, params, file);

				expect(result).toBeInstanceOf(FileRecord);
			});

			describe('Antivirus handling by upload ', () => {
				describe('when useStreamToAntivirus is true', () => {
					it('should call antivirusService.scanStream with PassThrough stream', async () => {
						const { params, file, userId } = setup();
						jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', true);

						await service.uploadFile(userId, params, file);

						expect(antivirusService.scanStream).toHaveBeenCalledWith(expect.any(PassThrough));
					});
				});

				describe('when useStreamToAntivirus is false', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const { params, file, userId } = setup();
						jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', false);

						const fileRecord = await service.uploadFile(userId, params, file);

						expect(antivirusService.send).toHaveBeenCalledWith(fileRecord.getSecurityToken());
					});
				});
			});
		});

		describe('WHEN file record repo throws error', () => {
			const setup = () => {
				const { params, file, userId, fileRecord } = createUploadFileParams();
				const error = new Error('test');

				jest.spyOn(service, 'getFileRecordsByParent').mockResolvedValue([[fileRecord], 1]);
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce('image/tiff');

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
				const { params, file, userId, fileRecord } = createUploadFileParams();
				const error = new Error('test');

				jest.spyOn(service, 'getFileRecordsByParent').mockResolvedValue([[fileRecord], 1]);
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce('image/tiff');
				fileRecordRepo.save.mockResolvedValue(Promise.resolve());
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
				const { params, file, userId, fileRecord } = createUploadFileParams();

				jest.spyOn(service, 'getFileRecordsByParent').mockResolvedValue([[fileRecord], 1]);
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce('image/tiff');
				fileRecordRepo.save.mockResolvedValue(Promise.resolve());
				jest.replaceProperty(config, 'filesStorageMaxFileSize', 2);

				return { params, file, userId };
			};

			it('should pass error and call storageClient.delete and fileRecordRepo.delete', async () => {
				const { params, file, userId } = setup();

				const error = new BadRequestException(ErrorType.FILE_TOO_BIG);
				await expect(service.uploadFile(userId, params, file)).rejects.toThrow(error);
				expect(storageClient.delete).toHaveBeenCalled();
				expect(fileRecordRepo.delete).toHaveBeenCalled();
			});
		});

		describe('WHEN file size is bigger than maxSecurityCheckFileSize', () => {
			const setup = () => {
				const { params, file, userId, fileRecord } = createUploadFileParams();

				jest.spyOn(service, 'getFileRecordsByParent').mockResolvedValue([[fileRecord], 1]);
				jest.replaceProperty(config, 'filesStorageMaxSecurityCheckFileSize', 2);
				fileRecordRepo.save.mockResolvedValue(Promise.resolve());
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce('image/tiff');

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
				const { params, file, userId, fileRecord } = createUploadFileParams();
				const error = new Error('test');

				jest.spyOn(service, 'getFileRecordsByParent').mockResolvedValue([[fileRecord], 1]);
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce('image/tiff');
				fileRecordRepo.save.mockResolvedValue(Promise.resolve());

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

		describe('WHEN stream emits error', () => {
			const setup = () => {
				const sourceFile = passThroughFileDtoTestFactory().asTiff().build();
				const fileRecord = fileRecordTestFactory().build(sourceFile);
				const parentInfo = fileRecord.getParentInfo();
				const fileDtoWithFailingStream = passThroughFileDtoTestFactory().withForcedStreamError().build(sourceFile);

				antivirusService.scanStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});
				jest.spyOn(service, 'getFileRecordsByParent').mockResolvedValue([[fileRecord], 1]);
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce(sourceFile.mimeType);
				fileRecordRepo.save.mockResolvedValue(Promise.resolve());
				jest.spyOn(PassThroughFileDtoFactory, 'create').mockReturnValueOnce(fileDtoWithFailingStream);

				return {
					params: parentInfo,
					file: sourceFile,
					userId: parentInfo.parentId,
				};
			};

			it('should throw internal server error with original stream error as cause', async () => {
				const { params, file, userId } = setup();

				const resultPromise = service.uploadFile(userId, params, file);

				await expect(resultPromise).rejects.toThrow(InternalServerErrorException);
			});
		});
	});

	describe('updateFileContents is called', () => {
		describe('WHEN update is successfull', () => {
			const setup = (file: FileDto) => {
				const fileRecord = fileRecordTestFactory().build(file);

				const mimeTypeSpy = jest
					.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream')
					.mockResolvedValueOnce(file.mimeType);

				antivirusService.scanStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});

				return {
					mimeTypeSpy,
					fileRecord,
					file,
				};
			};

			it('should call getMimeType with correct params', async () => {
				const file = passThroughFileDtoTestFactory().asPng().build();
				const { fileRecord, mimeTypeSpy } = setup(file);

				await service.updateFileContents(fileRecord, file);

				expect(mimeTypeSpy).toHaveBeenCalledWith(expect.any(Readable), expect.any(String));
			});

			it('should call fileRecordRepo.save ', async () => {
				const file = passThroughFileDtoTestFactory().asPng().build();
				const { fileRecord } = setup(file);

				await service.updateFileContents(fileRecord, file);

				const expectedFileRecord = fileRecord.getProps();
				const expectedSecurityCheck = fileRecord.getSecurityCheckProps();
				expect(fileRecordRepo.save).toHaveBeenLastCalledWith(
					expect.objectContaining({
						props: {
							...expectedFileRecord,
							mimeType: file.mimeType,
							size: 8,
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
				const file = passThroughFileDtoTestFactory().asPng().build();
				const { fileRecord } = setup(file);

				await service.updateFileContents(fileRecord, file);

				const expectedCalledParams = {
					data: expect.any(PassThrough),
					mimeType: fileRecord.mimeType,
					name: fileRecord.getName(),
					abortSignal: file.abortSignal,
					fileSize: 8,
					streamCompletion: expect.any(Promise),
				};
				expect(storageClient.create).toHaveBeenCalledWith(fileRecord.createPath(), expectedCalledParams);
			});

			it('should return an instance of FileRecord', async () => {
				const file = passThroughFileDtoTestFactory().asPng().build();
				const { fileRecord } = setup(file);

				const result = await service.updateFileContents(fileRecord, file);

				expect(result).toMatchObject({
					...fileRecord,
				});
			});

			describe('Antivirus handling by upload ', () => {
				describe('when useStreamToAntivirus is true, fileRecord is previewable and has not a collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const file = passThroughFileDtoTestFactory().asPng().build();
						const { fileRecord } = setup(file);
						jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', true);

						await service.updateFileContents(fileRecord, file);

						expect(antivirusService.scanStream).toHaveBeenCalledWith(expect.any(PassThrough));
						expect(antivirusService.send).not.toHaveBeenCalled();
					});
				});

				describe('when useStreamToAntivirus is true, fileRecord is not previewable and has collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const file = passThroughFileDtoTestFactory().asText().build();
						const { fileRecord } = setup(file);
						jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', true);

						await service.updateFileContents(fileRecord, file);

						expect(antivirusService.scanStream).toHaveBeenCalledWith(expect.any(PassThrough));
						expect(antivirusService.send).not.toHaveBeenCalled();
					});
				});

				describe('when useStreamToAntivirus is true and fileRecord is not previewable and has no collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const file = passThroughFileDtoTestFactory().asAac().build();
						const { fileRecord } = setup(file);
						jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', true);

						await service.updateFileContents(fileRecord, file);

						expect(antivirusService.send).toHaveBeenCalledWith(fileRecord.getSecurityToken());
						expect(antivirusService.scanStream).not.toHaveBeenCalled();
					});
				});

				describe('when useStreamToAntivirus is false and fileRecord is previewable and has no collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const file = passThroughFileDtoTestFactory().asPng().build();
						const { fileRecord } = setup(file);
						jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', false);

						await service.updateFileContents(fileRecord, file);

						expect(antivirusService.send).toHaveBeenCalledWith(fileRecord.getSecurityToken());
						expect(antivirusService.scanStream).not.toHaveBeenCalled();
					});
				});

				describe('when useStreamToAntivirus is false and fileRecord is not previewable and has collabora mimeType', () => {
					it('should call antivirusService.send with fileRecord', async () => {
						const file = passThroughFileDtoTestFactory().asText().build();
						const { fileRecord } = setup(file);
						jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', false);

						await service.updateFileContents(fileRecord, file);

						expect(antivirusService.send).toHaveBeenCalledWith(fileRecord.getSecurityToken());
						expect(antivirusService.scanStream).not.toHaveBeenCalled();
					});
				});
			});
		});

		describe('WHEN storageClient throws error', () => {
			describe('when useStreamToAntivirus is true', () => {
				const setup = () => {
					jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', true);

					const file = passThroughFileDtoTestFactory().asPng().build();
					const fileRecord = fileRecordTestFactory().build(file);

					jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce(file.mimeType);

					const error = new Error('test');
					storageClient.create.mockRejectedValueOnce(error);

					return {
						error,
						fileRecord,
						file,
					};
				};

				it('should pass error', async () => {
					const { file, fileRecord, error } = setup();

					await expect(service.updateFileContents(fileRecord, file)).rejects.toThrow(error);
				});
			});

			describe('when useStreamToAntivirus is false', () => {
				const setup = () => {
					jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', false);

					const file = passThroughFileDtoTestFactory().asPng().build();
					const fileRecord = fileRecordTestFactory().build(file);

					jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce(file.mimeType);

					const error = new Error('test');
					storageClient.create.mockRejectedValueOnce(error);

					antivirusService.scanStream.mockResolvedValueOnce({
						virus_detected: undefined,
						virus_signature: undefined,
						error: undefined,
					});

					return {
						error,
						file,
						fileRecord,
					};
				};

				it('should pass error and call storageClient.delete and fileRecordRepo.delete', async () => {
					const { file, fileRecord, error } = setup();

					await expect(service.updateFileContents(fileRecord, file)).rejects.toThrow(error);
				});
			});
		});

		describe('WHEN file is too big', () => {
			const setup = () => {
				jest.replaceProperty(config, 'filesStorageMaxFileSize', 0);

				const file = passThroughFileDtoTestFactory().asPng().build();
				const fileRecord = fileRecordTestFactory().build(file);
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce(file.mimeType);

				return {
					fileRecord,
					file,
				};
			};

			it('should pass error', async () => {
				const { file, fileRecord } = setup();

				const expectedError = new BadRequestException(ErrorType.FILE_TOO_BIG);
				await expect(service.updateFileContents(fileRecord, file)).rejects.toThrow(expectedError);
			});
		});

		describe('WHEN file size is bigger than maxSecurityCheckFileSize', () => {
			const setup = () => {
				jest.replaceProperty(config, 'filesStorageMaxSecurityCheckFileSize', 0);

				const file = passThroughFileDtoTestFactory().asPng().build();
				const fileRecord = fileRecordTestFactory().build(file);
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce(file.mimeType);

				return {
					file,
					fileRecord,
				};
			};

			it('should call save with WONT_CHECK status', async () => {
				const { file, fileRecord } = setup();

				await service.updateFileContents(fileRecord, file);

				expect(fileRecordRepo.save).toHaveBeenNthCalledWith(
					1,

					expect.objectContaining({ securityCheck: expect.objectContaining({ status: 'wont_check' }) })
				);
			});

			it('should not call antivirus send', async () => {
				const { file, fileRecord } = setup();

				await service.updateFileContents(fileRecord, file);

				expect(antivirusService.send).not.toHaveBeenCalled();
			});
		});

		describe('WHEN antivirusService throws error', () => {
			describe('when useStreamToAntivirus is true', () => {
				const setup = () => {
					jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', true);

					const file = passThroughFileDtoTestFactory().asPng().build();
					const fileRecord = fileRecordTestFactory().build(file);
					jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce(file.mimeType);

					const error = new Error('test');
					antivirusService.scanStream.mockRejectedValueOnce(error);

					return {
						file,
						fileRecord,
						error,
					};
				};

				it('should pass error', async () => {
					const { file, fileRecord, error } = setup();

					await expect(service.updateFileContents(fileRecord, file)).rejects.toThrow(error);
				});
			});

			describe('when useStreamToAntivirus is false', () => {
				const setup = () => {
					jest.replaceProperty(config, 'filesStorageUseStreamToAntivirus', false);

					const file = passThroughFileDtoTestFactory().asPng().build();
					const fileRecord = fileRecordTestFactory().build(file);
					jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce(file.mimeType);

					const error = new Error('test');
					antivirusService.send.mockRejectedValueOnce(error);

					return {
						file,
						fileRecord,
						error,
					};
				};

				it('should pass error', async () => {
					const { file, fileRecord, error } = setup();

					await expect(service.updateFileContents(fileRecord, file)).rejects.toThrow(error);
				});
			});
		});

		describe('WHEN getMimeType returns different mime type than original', () => {
			const setup = () => {
				const file = passThroughFileDtoTestFactory().asPng().build();
				const fileRecord = fileRecordTestFactory().build(file);
				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce('other');

				antivirusService.scanStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});

				return {
					file,
					fileRecord,
				};
			};

			it('should throw', async () => {
				const { file, fileRecord } = setup();

				await expect(service.updateFileContents(fileRecord, file)).rejects.toThrow(
					new ConflictException(ErrorType.MIME_TYPE_MISMATCH)
				);
			});
		});

		describe('WHEN mime type is SVG (unsupported by file-type package)', () => {
			const setup = () => {
				const file = passThroughFileDtoTestFactory().asSvg().build();
				const fileRecord = fileRecordTestFactory().build(file);
				const mimeTypeSpy = jest
					.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream')
					.mockResolvedValueOnce(file.mimeType);
				antivirusService.scanStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});

				return {
					file,
					fileRecord,
					mimeTypeSpy,
				};
			};

			it('should use dto mime type', async () => {
				const { file, fileRecord } = setup();

				await service.updateFileContents(fileRecord, file);

				expect(fileRecordRepo.save).toHaveBeenCalledWith(expect.objectContaining({ mimeType: file.mimeType }));
			});

			it('should call detectMimeTypeByStream and return fallback for unsupported MIME type', async () => {
				const { file, fileRecord, mimeTypeSpy } = setup();

				await service.updateFileContents(fileRecord, file);

				expect(mimeTypeSpy).toHaveBeenCalledWith(expect.any(Readable), file.mimeType);
			});
		});

		describe('WHEN stream processing fails during updateFileContents', () => {
			const setup = () => {
				const file = passThroughFileDtoTestFactory().asPng().build();
				const fileRecord = fileRecordTestFactory().build(file);
				const fileDtoWithFailingStream = passThroughFileDtoTestFactory().withForcedStreamError().build(file);

				jest.spyOn(detectMimeTypeUtils, 'detectMimeTypeByStream').mockResolvedValueOnce(file.mimeType);
				antivirusService.scanStream.mockResolvedValueOnce({
					virus_detected: undefined,
					virus_signature: undefined,
					error: undefined,
				});
				jest.spyOn(PassThroughFileDtoFactory, 'create').mockReturnValueOnce(fileDtoWithFailingStream);

				return {
					file,
					fileRecord,
				};
			};

			it('should throw internal server error with original stream error as cause', async () => {
				const { file, fileRecord } = setup();

				const resultPromise = service.updateFileContents(fileRecord, file);

				await expect(resultPromise).rejects.toThrow(InternalServerErrorException);
			});
		});
	});
});
