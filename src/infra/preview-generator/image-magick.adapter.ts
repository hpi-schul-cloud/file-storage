import { UnprocessableEntityException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';

/**
 * Restricted PATH containing only standard system directories.
 * This prevents PATH injection attacks by ensuring only trusted
 * system binaries can be executed.
 */
const SAFE_PATH = '/usr/local/bin:/usr/bin:/bin';

export class ImageMagickAdapter {
	/**
	 * Optional absolute path to the magick binary.
	 * If set, this path will be used directly instead of relying on PATH resolution.
	 * Can be configured at application startup via ImageMagickAdapter.setBinaryPath().
	 */
	private static binaryPath: string = 'magick';

	/**
	 * Sets the absolute path to the ImageMagick binary.
	 * Use this at application startup to hardcode the binary location.
	 * @param path - Absolute path to the magick binary (e.g., '/usr/bin/magick')
	 */
	public static setBinaryPath(path: string): void {
		ImageMagickAdapter.binaryPath = path;
	}

	/**
	 * Returns the currently configured binary path.
	 */
	public static getBinaryPath(): string {
		return ImageMagickAdapter.binaryPath;
	}

	private readonly args: string[] = [];
	private readonly inputStream: Readable;
	private frameSelector?: string;

	constructor(inputStream: Readable) {
		this.inputStream = inputStream;
	}

	public selectFrame(frame: number): this {
		this.frameSelector = `[${frame}]`;

		return this;
	}

	// Coalesce image layers needed for animated GIFs
	public coalesce(): this {
		this.args.push('-coalesce');

		return this;
	}

	public resize(width?: number, height?: number, options?: string): this {
		if (!width && !height) {
			return this;
		}

		let geometry = '';
		if (width && height) {
			geometry = `${width}x${height}${options ?? ''}`;
		} else if (width) {
			geometry = `${width}${options ?? ''}`;
		} else if (height) {
			geometry = `x${height}${options ?? ''}`;
		}

		if (geometry) {
			this.args.push('-resize', geometry);
		}

		return this;
	}

	public stream(format: string, callback: (err: Error | null, stdout?: Readable, stderr?: Readable) => void): void {
		const input = `-${this.frameSelector ?? ''}`;
		const output = `${format}:-`;
		const commandArgs = ['convert', input, ...this.args, output];

		const magickProcess = spawn(ImageMagickAdapter.binaryPath, commandArgs, {
			env: { PATH: SAFE_PATH },
		});

		let callbackCalled = false;
		const callOnce = (err: Error | null, stdout?: Readable, stderr?: Readable): void => {
			if (!callbackCalled) {
				callbackCalled = true;
				callback(err, stdout, stderr);
			}
		};

		magickProcess.on('error', (err) => {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
				callOnce(
					new UnprocessableEntityException('Could not execute ImageMagick: magick binary not found', {
						cause: err,
					})
				);
			} else {
				callOnce(err);
			}
		});

		this.inputStream.pipe(magickProcess.stdin);

		magickProcess.stdin.on('error', (err) => {
			callOnce(err);
		});

		if (magickProcess.stdout && magickProcess.stderr) {
			callOnce(null, magickProcess.stdout, magickProcess.stderr);
		}
	}
}
