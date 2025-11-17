import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
	OnModuleDestroy,
	RequestTimeoutException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface UploadInfo {
	aborted: boolean;
	startTime: number;
	userAgent?: string;
	contentLength?: string;
}

/**
 * Monitors upload requests and handles browser-specific timeout behaviors.
 * Prevents FileRecord creation when upload is aborted by client.
 */
@Injectable()
export class UploadMonitorInterceptor implements NestInterceptor, OnModuleDestroy {
	private readonly logger = new Logger(UploadMonitorInterceptor.name);

	private readonly activeUploads = new Map<string, UploadInfo>();

	// Configuration constants
	private readonly CLEANUP_INTERVAL = 60000; // 1 minute
	private readonly UPLOAD_TIMEOUT = 300000; // 5 minutes
	private readonly RETRY_DETECTION_WINDOW = 30000; // 30 seconds

	// Cleanup timer
	private cleanupInterval: NodeJS.Timeout;

	constructor() {
		// Start periodic cleanup
		this.cleanupInterval = setInterval(() => {
			this.cleanupExpiredUploads();
		}, this.CLEANUP_INTERVAL);
	}

	public onModuleDestroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}

	private cleanupExpiredUploads(): void {
		const now = Date.now();
		const expiredUploads: string[] = [];

		for (const [uploadId, info] of this.activeUploads.entries()) {
			if (now - info.startTime > this.UPLOAD_TIMEOUT) {
				expiredUploads.push(uploadId);
			}
		}

		expiredUploads.forEach((uploadId) => {
			this.activeUploads.delete(uploadId);
			this.logger.debug(`Cleaned up expired upload: ${uploadId}`);
		});

		if (expiredUploads.length > 0) {
			this.logger.log(`Cleaned up ${expiredUploads.length} expired uploads`);
		}
	}

	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();
		const uploadId = this.generateUploadId(request);

		this.logger.debug(`Starting upload monitoring for: ${uploadId}`);

		// Check if this is likely a browser retry
		if (this.isLikelyBrowserRetry(request)) {
			this.logger.warn(`Detected likely browser retry, aborting: ${uploadId}`);

			return throwError(() => new RequestTimeoutException('Upload aborted - preventing duplicate processing'));
		}

		// Track this upload with enhanced info
		const uploadInfo: UploadInfo = {
			aborted: false,
			startTime: Date.now(),
			userAgent: request.headers['user-agent'],
			contentLength: request.headers['content-length'],
		};

		this.activeUploads.set(uploadId, uploadInfo);

		// Monitor request for early termination with proper error handling
		const onClose = (): void => {
			const currentUploadInfo = this.activeUploads.get(uploadId);
			if (currentUploadInfo && !request.complete) {
				currentUploadInfo.aborted = true;
				this.logger.debug(`Upload connection closed early: ${uploadId}`);
			}
		};

		const onAborted = (): void => {
			const currentUploadInfo = this.activeUploads.get(uploadId);
			if (currentUploadInfo) {
				currentUploadInfo.aborted = true;
				this.logger.debug(`Upload aborted by client: ${uploadId}`);
			}
		};

		request.on('close', onClose);
		request.on('aborted', onAborted);

		// Set headers to prevent browser retry and caching
		this.setAntiRetryHeaders(response);

		return next.handle().pipe(
			tap(() => {
				// Upload completed successfully
				this.activeUploads.delete(uploadId);
				this.logger.debug(`Upload completed successfully: ${uploadId}`);
				// Cleanup event listeners
				request.off('close', onClose);
				request.off('aborted', onAborted);
			}),
			catchError((error) => {
				// Check if upload was aborted during processing
				const currentUploadInfo = this.activeUploads.get(uploadId);
				this.activeUploads.delete(uploadId);

				// Cleanup event listeners
				request.off('close', onClose);
				request.off('aborted', onAborted);

				if (currentUploadInfo?.aborted) {
					this.logger.warn(`Upload was aborted by client during processing: ${uploadId}`);

					return throwError(() => new RequestTimeoutException('Upload was aborted by client'));
				}

				this.logger.error(`Upload failed: ${uploadId}`, error);

				return throwError(() => error);
			})
		);
	}

	private setAntiRetryHeaders(response: Response): void {
		response.setHeader('Connection', 'close');
		response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
		response.setHeader('Pragma', 'no-cache');
		response.setHeader('Expires', '0');
		response.setHeader('Surrogate-Control', 'no-store');
	}

	private generateUploadId(request: Request): string {
		const contentLength = request.headers['content-length'] ?? 'unknown';
		const userAgent = (request.headers['user-agent'] ?? '').slice(0, 20); // First 20 chars
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(2, 8);

		return `${request.ip}-${contentLength}-${userAgent}-${timestamp}-${randomSuffix}`.replace(/[^a-zA-Z0-9-]/g, '');
	}

	private isLikelyBrowserRetry(request: Request): boolean {
		const userAgent = request.headers['user-agent'] ?? '';
		const contentLength = request.headers['content-length'];

		// Enhanced browser detection
		const isProblematicBrowser = this.isProblematicBrowser(userAgent);

		if (!isProblematicBrowser || !contentLength) {
			return false;
		}

		// Look for similar uploads in the retry detection window
		const cutoffTime = Date.now() - this.RETRY_DETECTION_WINDOW;

		for (const [, info] of this.activeUploads.entries()) {
			if (
				info.startTime > cutoffTime &&
				info.contentLength === contentLength &&
				this.isSimilarUserAgent(info.userAgent, userAgent)
			) {
				return true;
			}
		}

		return false;
	}

	private isProblematicBrowser(userAgent: string): boolean {
		const ua = userAgent.toLowerCase();

		// Known browsers with retry issues
		return (
			ua.includes('firefox') ||
			(ua.includes('chrome') && ua.includes('mobile')) || // Chrome mobile can have issues
			(ua.includes('safari') && ua.includes('mobile')) // Safari mobile
		);
	}

	private isSimilarUserAgent(userAgent1?: string, userAgent2?: string): boolean {
		if (!userAgent1 || !userAgent2) {
			return false;
		}

		// Extract browser and version info for comparison
		const extractBrowserInfo = (ua: string): string => {
			const regex = /(firefox|chrome|safari|edge)\/[\d.]+/i;
			const match = regex.exec(ua);

			return match ? match[0].toLowerCase() : ua.slice(0, 50).toLowerCase();
		};

		return extractBrowserInfo(userAgent1) === extractBrowserInfo(userAgent2);
	}
}
