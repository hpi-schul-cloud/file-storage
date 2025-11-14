import { Logger } from '@infra/logger';
import { File } from '@infra/s3-client';
import { Readable } from 'stream';
import { S3ClientAdapter } from './s3-client.adapter';

describe('S3ClientAdapter - Stream Abort Handling', () => {
	let adapter: S3ClientAdapter;
	let mockClient: any;
	let mockConfig: any;
	let mockLogger: jest.Mocked<Logger>;
	let mockErrorHandler: any;

	beforeEach(() => {
		mockClient = {
			send: jest.fn(),
		};
		mockConfig = {
			bucket: 'test-bucket',
			connectionName: 'test-connection',
		};
		mockLogger = {
			debug: jest.fn(),
			warning: jest.fn(),
			setContext: jest.fn(),
		} as unknown as jest.Mocked<Logger>;
		mockErrorHandler = {
			exec: jest.fn(),
		};

		adapter = new S3ClientAdapter(mockClient, mockConfig, mockLogger, mockErrorHandler);
	});

	describe('create with abort signal', () => {
		it('should abort upload when AbortSignal is triggered', async () => {
			// Setup
			const abortController = new AbortController();
			const mockStream = new Readable({ read: () => {} });

			const file: File = {
				data: mockStream,
				mimeType: 'text/plain',
				abortSignal: abortController.signal,
			};

			const mockUpload = {
				done: jest.fn(),
				abort: jest.fn(),
				on: jest.fn(),
			};

			// Mock Upload constructor
			jest.doMock('@aws-sdk/lib-storage', () => ({
				Upload: jest.fn().mockImplementation(() => mockUpload),
			}));

			// Act - abort the signal before upload starts
			abortController.abort();

			// Try to create upload
			try {
				await adapter.create('test/path', file);
			} catch (error) {
				// Expected to throw or abort
			}

			// Assert
			expect(mockUpload.abort).toHaveBeenCalled();
			expect(mockLogger.warning).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Upload aborted'),
				})
			);
		});

		it('should handle stream errors and abort upload', async () => {
			// Setup
			const mockStream = new Readable({ read: () => {} });
			const file: File = {
				data: mockStream,
				mimeType: 'text/plain',
			};

			const mockUpload = {
				done: jest.fn().mockResolvedValue({}),
				abort: jest.fn(),
				on: jest.fn(),
			};

			jest.doMock('@aws-sdk/lib-storage', () => ({
				Upload: jest.fn().mockImplementation(() => mockUpload),
			}));

			// Act - start upload and then emit stream error
			const uploadPromise = adapter.create('test/path', file);

			// Simulate stream error
			process.nextTick(() => {
				mockStream.emit('error', new Error('Stream connection lost'));
			});

			// Assert
			await expect(uploadPromise).resolves.toBeDefined();
			expect(mockUpload.abort).toHaveBeenCalled();
			expect(mockLogger.warning).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Upload stream error'),
				})
			);
		});
	});

	describe('get with improved stream handling', () => {
		it('should handle source stream errors properly', async () => {
			// Setup
			const mockSourceStream = new Readable({ read: () => {} });
			const mockResponse = {
				Body: mockSourceStream,
				ContentType: 'text/plain',
				ContentLength: 100,
			};

			mockClient.send.mockResolvedValue(mockResponse);

			// Act
			const result = await adapter.get('test/path');

			// Simulate stream error
			process.nextTick(() => {
				mockSourceStream.emit('error', new Error('Connection lost'));
			});

			// Assert
			expect(result.data).toBeDefined();
			expect(mockLogger.warning).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Source stream error'),
				})
			);
		});
	});
});
