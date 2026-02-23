import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { Logger } from '@infra/logger';
import { GetFile, S3ClientAdapter } from '@infra/s3-client';
import { UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PassThrough, Readable } from 'node:stream';
import { ErrorType } from './interface/error-status.enum';
import { PreviewNotPossibleException } from './loggable/preview-exception';
import { FILE_STORAGE_CLIENT, PreviewGeneratorService } from './preview-generator.service';

let streamMock: jest.Mock;
let resizeMock: jest.Mock;
let coalesceMock: jest.Mock;
let selectFrameMock: jest.Mock;

jest.mock('./image-magick.adapter', () => {
	return {
		ImageMagickAdapter: jest.fn(),
	};
});

const createFile = (contentRange?: string, contentType?: string): GetFile => {
	const text = 'testText';
	const readable = Readable.from(text);

	const fileResponse = {
		data: readable,
		contentType,
		contentLength: text.length,
		contentRange,
		etag: 'testTag',
	};

	return fileResponse;
};

const setupImageMagickMock = () => {
	const { ImageMagickAdapter } = require('./image-magick.adapter');

	// Initialize mocks
	streamMock = jest.fn();
	resizeMock = jest.fn();
	coalesceMock = jest.fn();
	selectFrameMock = jest.fn();

	// Setup the mock implementation
	(ImageMagickAdapter as jest.Mock).mockImplementation(() => {
		const mockInstance = {
			stream: streamMock,
			resize: resizeMock,
			selectFrame: selectFrameMock,
			coalesce: coalesceMock,
		};
		// Enable method chaining
		resizeMock.mockReturnValue(mockInstance);
		coalesceMock.mockReturnValue(mockInstance);
		selectFrameMock.mockReturnValue(mockInstance);

		return mockInstance;
	});
};

const createMockStream = (err: Error | null = null) => {
	const stdout = new PassThrough();
	const stderr = new PassThrough();

	streamMock = jest
		.fn()
		.mockImplementation(
			(_format: string, callback: (err: Error | null, stdout: PassThrough, stderr: PassThrough) => void) => {
				callback(err, stdout, stderr);
			}
		);

	return { stdout, stderr };
};

describe('PreviewGeneratorService', () => {
	let module: TestingModule;
	let service: PreviewGeneratorService;
	let s3ClientAdapter: DeepMocked<S3ClientAdapter>;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			providers: [
				PreviewGeneratorService,
				{
					provide: FILE_STORAGE_CLIENT,
					useValue: createMock<S3ClientAdapter>(),
				},
				{
					provide: Logger,
					useValue: createMock<Logger>(),
				},
			],
		}).compile();

		service = module.get(PreviewGeneratorService);
		s3ClientAdapter = module.get(FILE_STORAGE_CLIENT);
	});

	afterAll(async () => {
		await module.close();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('generatePreview', () => {
		describe('WHEN download of original and preview file is successful', () => {
			describe('WHEN preview is possible', () => {
				describe('WHEN mime type is jpeg', () => {
					const setup = (width = 500) => {
						setupImageMagickMock();

						const params = {
							originFilePath: 'file/test.jpeg',
							previewFilePath: 'preview/text.webp',
							previewOptions: {
								format: 'webp',
								width,
							},
						};
						const originFile = createFile(undefined, 'image/jpeg');
						s3ClientAdapter.get.mockResolvedValueOnce(originFile);

						const data = Buffer.from('text');
						const { stdout } = createMockStream();

						process.nextTick(() => {
							stdout.write(data);
						});

						return { params, originFile };
					};

					it('should call storageClient get method with originFilePath', async () => {
						const { params } = setup();

						await service.generatePreview(params);

						expect(s3ClientAdapter.get).toHaveBeenCalledWith(params.originFilePath);
					});

					it('should call imagemagicks resize method', async () => {
						const { params } = setup();

						await service.generatePreview(params);

						expect(resizeMock).toHaveBeenCalledWith(params.previewOptions.width, undefined, '>');
						expect(resizeMock).toHaveBeenCalledTimes(1);
					});

					it('should call imagemagicks stream method', async () => {
						const { params } = setup();

						await service.generatePreview(params);

						expect(streamMock).toHaveBeenCalledWith(params.previewOptions.format, expect.any(Function));
						expect(streamMock).toHaveBeenCalledTimes(1);
					});

					it('should call S3ClientAdapters create method', async () => {
						const { params } = setup();

						const expectedFileData = expect.objectContaining({
							data: expect.any(PassThrough),
							mimeType: params.previewOptions.format,
						});

						await service.generatePreview(params);

						expect(s3ClientAdapter.create).toHaveBeenCalledWith(params.previewFilePath, expectedFileData);
						expect(s3ClientAdapter.create).toHaveBeenCalledTimes(1);
					});

					it('should should return values', async () => {
						const { params } = setup();
						const expectedValue = { previewFilePath: params.previewFilePath, status: true };

						const result = await service.generatePreview(params);

						expect(result).toEqual(expectedValue);
					});
				});

				describe('WHEN mime type is pdf', () => {
					const setup = (width = 500) => {
						setupImageMagickMock();

						const params = {
							originFilePath: 'file/test.pdf',
							previewFilePath: 'preview/text.webp',
							previewOptions: {
								format: 'webp',
								width,
							},
						};
						const originFile = createFile(undefined, 'application/pdf');
						s3ClientAdapter.get.mockResolvedValueOnce(originFile);

						const data = Buffer.from('text');
						const { stdout } = createMockStream();

						process.nextTick(() => {
							stdout.write(data);
						});

						return { params, originFile };
					};

					it('should call imagemagicks selectFrameMock method', async () => {
						const { params } = setup();

						await service.generatePreview(params);

						expect(selectFrameMock).toHaveBeenCalledWith(0);
						expect(resizeMock).toHaveBeenCalledTimes(1);
					});
				});

				describe('WHEN mime type is gif', () => {
					const setup = (width = 500) => {
						setupImageMagickMock();

						const params = {
							originFilePath: 'file/test.gif',
							previewFilePath: 'preview/text.webp',
							previewOptions: {
								format: 'webp',
								width,
							},
						};
						const originFile = createFile(undefined, 'image/gif');
						s3ClientAdapter.get.mockResolvedValueOnce(originFile);

						const data = Buffer.from('text');
						const { stdout } = createMockStream();

						process.nextTick(() => {
							stdout.write(data);
						});

						return { params, originFile };
					};

					it('should call imagemagicks coalesce method', async () => {
						const { params } = setup();

						await service.generatePreview(params);

						expect(coalesceMock).toHaveBeenCalledTimes(1);
						expect(resizeMock).toHaveBeenCalledTimes(1);
					});
				});
			});

			describe('WHEN preview is not possible', () => {
				const setup = (mimeType?: string, width = 500) => {
					setupImageMagickMock();

					const params = {
						originFilePath: 'file/test.jpeg',
						previewFilePath: 'preview/text.webp',
						previewOptions: {
							format: 'webp',
							width,
						},
					};
					const originFile = createFile(undefined, mimeType);
					s3ClientAdapter.get.mockResolvedValueOnce(originFile);

					return { params, originFile };
				};

				describe('WHEN mimeType is undefined', () => {
					it('should throw UnprocessableEntityException', async () => {
						const { params } = setup();

						const error = new PreviewNotPossibleException(params);
						await expect(service.generatePreview(params)).rejects.toThrow(error);
					});
				});

				describe('WHEN mimeType is text/plain ', () => {
					it('should throw UnprocessableEntityException', async () => {
						const { params } = setup('text/plain');

						const error = new PreviewNotPossibleException(params);
						await expect(service.generatePreview(params)).rejects.toThrow(error);
					});
				});
			});
		});

		describe('WHEN previewParams.width not set', () => {
			const setup = (width = 500) => {
				setupImageMagickMock();

				const params = {
					originFilePath: 'file/test.jpeg',
					previewFilePath: 'preview/text.webp',
					previewOptions: {
						format: 'webp',
						width,
					},
				};
				const originFile = createFile(undefined, 'image/jpeg');
				s3ClientAdapter.get.mockResolvedValueOnce(originFile);

				const data = Buffer.from('text');
				const { stdout } = createMockStream();

				process.nextTick(() => {
					stdout.write(data);
				});

				return { params, originFile };
			};

			it('should not call imagemagicks resize method', async () => {
				const { params } = setup(0);

				await service.generatePreview(params);

				expect(resizeMock).not.toHaveBeenCalledWith(params.previewOptions.width, undefined, '>');
				expect(resizeMock).not.toHaveBeenCalledTimes(1);
			});
		});

		describe('WHEN STDERR stream has an error', () => {
			const setup = () => {
				setupImageMagickMock();

				const params = {
					originFilePath: 'file/test.jpeg',
					previewFilePath: 'preview/text.webp',
					previewOptions: {
						format: 'webp',
					},
				};
				const originFile = createFile(undefined, 'image/jpeg');
				s3ClientAdapter.get.mockResolvedValueOnce(originFile);

				const data1 = Buffer.from('imagemagick ');
				const data2 = Buffer.from('is not found');
				const { stderr } = createMockStream();

				process.nextTick(() => {
					stderr.write(data1);
					stderr.write(data2);
					stderr.end();
				});

				const expectedError = new UnprocessableEntityException(ErrorType.CREATE_PREVIEW_NOT_POSSIBLE);

				return { params, originFile, expectedError };
			};

			it('should throw error', async () => {
				const { params, expectedError } = setup();

				await expect(service.generatePreview(params)).rejects.toThrow(expectedError);
			});

			it('should have external error in getLogMessage', async () => {
				const { params } = setup();
				try {
					await service.generatePreview(params);
				} catch (error) {
					expect(error.getLogMessage().error).toEqual(new Error('imagemagick is not found'));
				}
			});
		});

		describe('WHEN GM library has an error', () => {
			const setup = () => {
				setupImageMagickMock();

				const params = {
					originFilePath: 'file/test.jpeg',
					previewFilePath: 'preview/text.webp',
					previewOptions: {
						format: 'webp',
					},
				};
				const originFile = createFile(undefined, 'image/jpeg');
				s3ClientAdapter.get.mockResolvedValueOnce(originFile);

				createMockStream(new Error('imagemagic is not found'));

				const expectedError = new UnprocessableEntityException(ErrorType.CREATE_PREVIEW_NOT_POSSIBLE);

				return { params, originFile, expectedError };
			};

			it('should throw error', async () => {
				const { params, expectedError } = setup();

				await expect(service.generatePreview(params)).rejects.toThrow(expectedError);
			});
		});

		describe('WHEN s3ClientAdapter throws an error', () => {
			const setup = () => {
				setupImageMagickMock();

				const params = {
					originFilePath: 'file/test.jpeg',
					previewFilePath: 'preview/text.webp',
					previewOptions: {
						format: 'webp',
					},
				};
				const expectedError = new Error('S3 error');
				s3ClientAdapter.get.mockRejectedValueOnce(expectedError);

				return { params, expectedError };
			};

			it('should throw error', async () => {
				const { params, expectedError } = setup();

				await expect(service.generatePreview(params)).rejects.toThrow(expectedError);
			});
		});
	});
});
