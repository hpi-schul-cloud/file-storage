import { ExecutionContext, StreamableFile } from '@nestjs/common';
import { Request } from 'express';

export class InterceptorUtils {
	public static getCurrentTime(): number {
		return Date.now();
	}

	public static isStreamableResponse(response: StreamableFile): response is StreamableFile {
		return response != null && typeof response.getStream === 'function';
	}

	public static getChunkSize(chunk: Buffer | string): number {
		return Buffer.byteLength(chunk);
	}

	public static calculateDurationInSeconds(startTime: number): number {
		return (Date.now() - startTime) / 1000;
	}

	public static isValidTransfer(bytes: number, duration: number): boolean {
		return bytes > 0 && duration > 0;
	}

	public static calculateRateInMbPerSec(bytes: number, durationSeconds: number): number {
		const bytesToMb = bytes / 1024 / 1024;

		return bytesToMb / durationSeconds;
	}

	public static getRequest(context: ExecutionContext): Request {
		return context.switchToHttp().getRequest<Request>();
	}

	public static extractContentLength(request: Request): number {
		const contentLength = request.headers['content-length'];

		return contentLength ? parseInt(contentLength, 10) : 0;
	}
}
