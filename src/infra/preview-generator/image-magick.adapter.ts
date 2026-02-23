import { UnprocessableEntityException } from '@nestjs/common';
import { spawn } from 'child_process';
import { Readable } from 'stream';

export class ImageMagickAdapter {
	private args: string[] = [];
	private inputStream: Readable;
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

		const magickProcess = spawn('magick', commandArgs);

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

export function createImageMagickAdapter(inputStream: Readable): ImageMagickAdapter {
	return new ImageMagickAdapter(inputStream);
}
