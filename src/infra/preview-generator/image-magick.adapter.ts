import { UnprocessableEntityException } from '@nestjs/common';
import { spawn } from 'child_process';
import { Readable } from 'stream';

/**
 * ImageMagick Adapter
 *
 * Provides a fluent API to work with ImageMagick for image processing.
 * Replaces the gm library with a custom implementation that only includes
 * the functionality needed for preview generation.
 */
export class ImageMagickAdapter {
	private args: string[] = [];
	private inputStream: Readable;
	private frameSelector?: string;

	constructor(inputStream: Readable) {
		this.inputStream = inputStream;
	}

	/**
	 * Select a specific frame from a multi-frame image (e.g., PDF).
	 *
	 * @param frame - The frame number to select (0-indexed)
	 * @returns This adapter instance for method chaining
	 */
	public selectFrame(frame: number): this {
		this.frameSelector = `[${frame}]`;

		return this;
	}

	/**
	 * Coalesce image layers (useful for animated GIFs).
	 *
	 * @returns This adapter instance for method chaining
	 */
	public coalesce(): this {
		this.args.push('-coalesce');

		return this;
	}

	/**
	 * Resize the image with optional constraints.
	 *
	 * @param width - Target width (optional)
	 * @param height - Target height (optional)
	 * @param options - Additional resize options (e.g., '>' to only shrink)
	 * @returns This adapter instance for method chaining
	 */
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

	/**
	 * Execute the ImageMagick command and stream the result.
	 *
	 * @param format - Output format (e.g., 'webp', 'png')
	 * @param callback - Callback function with error, stdout, and stderr
	 */
	public stream(format: string, callback: (err: Error | null, stdout?: Readable, stderr?: Readable) => void): void {
		// Build the input specifier: -[frame] for reading from stdin
		const input = `-${this.frameSelector ?? ''}`;
		// Build the output specifier: format:- for writing to stdout
		const output = `${format}:-`;
		// Combine all arguments: convert input ...args output
		const commandArgs = ['convert', input, ...this.args, output];

		// Spawn the ImageMagick process
		const proc = spawn('magick', commandArgs);

		let callbackCalled = false;
		const callOnce = (err: Error | null, stdout?: Readable, stderr?: Readable): void => {
			if (!callbackCalled) {
				callbackCalled = true;
				callback(err, stdout, stderr);
			}
		};

		// Handle process spawn errors
		proc.on('error', (err) => {
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

		// Pipe the input stream to the process stdin
		this.inputStream.pipe(proc.stdin);

		// Handle stdin errors
		proc.stdin.on('error', (err) => {
			callOnce(err);
		});

		// Provide stdout and stderr to the callback
		if (proc.stdout && proc.stderr) {
			callOnce(null, proc.stdout, proc.stderr);
		}
	}
}

/**
 * Factory function to create an ImageMagickAdapter instance.
 * Mimics the interface of the gm library for easier migration.
 *
 * @param inputStream - The input stream to process
 * @returns A new ImageMagickAdapter instance
 */
export function createImageMagickAdapter(inputStream: Readable): ImageMagickAdapter {
	return new ImageMagickAdapter(inputStream);
}
