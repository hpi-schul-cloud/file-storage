import { UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter, PassThrough, Readable } from 'stream';
import { ImageMagickAdapter } from './image-magick.adapter';

jest.mock('child_process', () => ({
	spawn: jest.fn(),
}));

describe('ImageMagickAdapter', () => {
	let mockSpawn: jest.Mock;
	let mockProcess: {
		stdin: PassThrough;
		stdout: PassThrough;
		stderr: PassThrough;
		on: jest.Mock;
	};
	let inputStream: Readable;

	const setupMockProcess = () => {
		const stdin = new PassThrough();
		const stdout = new PassThrough();
		const stderr = new PassThrough();
		const processEmitter = new EventEmitter();

		mockProcess = {
			stdin,
			stdout,
			stderr,
			on: jest.fn((event, handler) => {
				processEmitter.on(event, handler);
			}),
		};

		return { processEmitter };
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockSpawn = require('child_process').spawn;
		inputStream = Readable.from(['test data']);
		setupMockProcess();
		mockSpawn.mockReturnValue(mockProcess);
	});

	describe('constructor', () => {
		it('should create an instance with input stream', () => {
			const adapter = new ImageMagickAdapter(inputStream);

			expect(adapter).toBeDefined();
			expect(adapter).toBeInstanceOf(ImageMagickAdapter);
		});
	});

	describe('selectFrame', () => {
		it('should set frame selector and return this for chaining', () => {
			const adapter = new ImageMagickAdapter(inputStream);

			const result = adapter.selectFrame(0);

			expect(result).toBe(adapter);
		});

		it('should add frame selector to stream command', () => {
			const adapter = new ImageMagickAdapter(inputStream);
			adapter.selectFrame(5);

			adapter.stream('webp', jest.fn());

			expect(mockSpawn).toHaveBeenCalledWith('magick', ['convert', '-[5]', 'webp:-']);
		});
	});

	describe('coalesce', () => {
		it('should add coalesce argument and return this for chaining', () => {
			const adapter = new ImageMagickAdapter(inputStream);

			const result = adapter.coalesce();

			expect(result).toBe(adapter);
		});

		it('should add -coalesce to command arguments', () => {
			const adapter = new ImageMagickAdapter(inputStream);
			adapter.coalesce();

			adapter.stream('webp', jest.fn());

			expect(mockSpawn).toHaveBeenCalledWith('magick', ['convert', '-', '-coalesce', 'webp:-']);
		});
	});

	describe('resize', () => {
		it('should return this for chaining', () => {
			const adapter = new ImageMagickAdapter(inputStream);

			const result = adapter.resize(100, 200);

			expect(result).toBe(adapter);
		});

		it('should add resize with width and height', () => {
			const adapter = new ImageMagickAdapter(inputStream);
			adapter.resize(100, 200);

			adapter.stream('webp', jest.fn());

			expect(mockSpawn).toHaveBeenCalledWith('magick', ['convert', '-', '-resize', '100x200', 'webp:-']);
		});

		it('should add resize with width only', () => {
			const adapter = new ImageMagickAdapter(inputStream);
			adapter.resize(100);

			adapter.stream('webp', jest.fn());

			expect(mockSpawn).toHaveBeenCalledWith('magick', ['convert', '-', '-resize', '100', 'webp:-']);
		});

		it('should add resize with height only', () => {
			const adapter = new ImageMagickAdapter(inputStream);
			adapter.resize(undefined, 200);

			adapter.stream('webp', jest.fn());

			expect(mockSpawn).toHaveBeenCalledWith('magick', ['convert', '-', '-resize', 'x200', 'webp:-']);
		});

		it('should add resize with options', () => {
			const adapter = new ImageMagickAdapter(inputStream);
			adapter.resize(100, undefined, '>');

			adapter.stream('webp', jest.fn());

			expect(mockSpawn).toHaveBeenCalledWith('magick', ['convert', '-', '-resize', '100>', 'webp:-']);
		});

		it('should not add resize when width and height are undefined', () => {
			const adapter = new ImageMagickAdapter(inputStream);
			adapter.resize();

			adapter.stream('webp', jest.fn());

			expect(mockSpawn).toHaveBeenCalledWith('magick', ['convert', '-', 'webp:-']);
		});
	});

	describe('stream', () => {
		it('should spawn magick process with correct arguments', () => {
			const adapter = new ImageMagickAdapter(inputStream);

			adapter.stream('webp', jest.fn());

			expect(mockSpawn).toHaveBeenCalledWith('magick', ['convert', '-', 'webp:-']);
		});

		it('should pipe input stream to process stdin', () => {
			const adapter = new ImageMagickAdapter(inputStream);
			const pipeSpy = jest.spyOn(inputStream, 'pipe');

			adapter.stream('webp', jest.fn());

			expect(pipeSpy).toHaveBeenCalledWith(mockProcess.stdin);
		});

		it('should call callback with stdout and stderr on success', (done) => {
			const adapter = new ImageMagickAdapter(inputStream);

			adapter.stream('webp', (err, stdout, stderr) => {
				expect(err).toBeNull();
				expect(stdout).toBe(mockProcess.stdout);
				expect(stderr).toBe(mockProcess.stderr);
				done();
			});
		});

		it('should handle ENOENT error when magick binary is not found', (done) => {
			const adapter = new ImageMagickAdapter(inputStream);
			const stdin = new PassThrough();
			const processEmitter = new EventEmitter();

			const failedMockProcess = {
				stdin,
				stdout: null,
				stderr: null,
				on: jest.fn((event, handler) => {
					processEmitter.on(event, handler);
				}),
			};

			mockSpawn.mockReturnValue(failedMockProcess);

			adapter.stream('webp', (err) => {
				expect(err).toBeInstanceOf(UnprocessableEntityException);
				if (err) {
					expect(err.message).toContain('Could not execute ImageMagick: magick binary not found');
				}
				done();
			});

			const enoentError = new Error('spawn magick ENOENT') as NodeJS.ErrnoException;
			enoentError.code = 'ENOENT';
			processEmitter.emit('error', enoentError);
		});

		it('should handle other spawn errors', (done) => {
			const adapter = new ImageMagickAdapter(inputStream);
			const stdin = new PassThrough();
			const processEmitter = new EventEmitter();
			const testError = new Error('Test error');

			const failedMockProcess = {
				stdin,
				stdout: null,
				stderr: null,
				on: jest.fn((event, handler) => {
					processEmitter.on(event, handler);
				}),
			};

			mockSpawn.mockReturnValue(failedMockProcess);

			adapter.stream('webp', (err) => {
				expect(err).toBe(testError);
				done();
			});

			processEmitter.emit('error', testError);
		});

		it('should handle stdin errors before successful callback', (done) => {
			const adapter = new ImageMagickAdapter(inputStream);
			const testError = new Error('Stdin error');
			const stdin = new PassThrough();

			const mockProcessWithError = {
				stdin,
				stdout: null,
				stderr: null,
				on: jest.fn(),
			};
			mockSpawn.mockReturnValue(mockProcessWithError);

			adapter.stream('webp', (err) => {
				expect(err).toBe(testError);
				done();
			});

			stdin.emit('error', testError);
		});

		it('should support method chaining before stream', () => {
			const adapter = new ImageMagickAdapter(inputStream);

			adapter.selectFrame(0).coalesce().resize(100, undefined, '>').stream('webp', jest.fn());

			expect(mockSpawn).toHaveBeenCalledWith('magick', ['convert', '-[0]', '-coalesce', '-resize', '100>', 'webp:-']);
		});
	});
});
