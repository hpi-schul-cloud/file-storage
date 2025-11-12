import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
	RequestTimeoutException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Monitors upload requests and handles browser-specific timeout behaviors.
 * Prevents FileRecord creation when upload is aborted by client.
 */
@Injectable()
export class UploadMonitorInterceptor implements NestInterceptor {
	private readonly logger = new Logger(UploadMonitorInterceptor.name);
	private readonly activeUploads = new Map<string, { aborted: boolean; startTime: number }>();

	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse();
		const uploadId = this.generateUploadId(request);

		// Check if this is likely a browser retry (Firefox issue)
		if (this.isLikelyBrowserRetry(request)) {
			this.logger.warn(`Detected potential browser retry for upload: ${uploadId}`);

			// Return early to prevent duplicate FileRecord creation
			return throwError(() => new RequestTimeoutException('Upload aborted - preventing duplicate processing'));
		}

		// Track this upload
		this.activeUploads.set(uploadId, { aborted: false, startTime: Date.now() });

		// Monitor request for early termination
		request.on('close', () => {
			const uploadInfo = this.activeUploads.get(uploadId);
			if (uploadInfo && !request.complete) {
				uploadInfo.aborted = true;
				this.logger.debug(`Upload ${uploadId} was aborted by client`);
			}
		});

		request.on('aborted', () => {
			const uploadInfo = this.activeUploads.get(uploadId);
			if (uploadInfo) {
				uploadInfo.aborted = true;
				this.logger.debug(`Upload ${uploadId} was explicitly aborted`);
			}
		});

		// Set headers to prevent browser retry
		response.setHeader('Connection', 'close');
		response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
		response.setHeader('Pragma', 'no-cache');
		response.setHeader('Expires', '0');

		return next.handle().pipe(
			tap(() => {
				// Upload completed successfully
				this.activeUploads.delete(uploadId);
			}),
			catchError((error) => {
				// Check if upload was aborted during processing
				const uploadInfo = this.activeUploads.get(uploadId);
				if (uploadInfo?.aborted) {
					this.logger.warn(`Upload ${uploadId} was aborted during processing, preventing FileRecord creation`);
					this.activeUploads.delete(uploadId);

					return throwError(() => new RequestTimeoutException('Upload was aborted by client'));
				}

				this.activeUploads.delete(uploadId);

				return throwError(() => error);
			})
		);
	}

	private generateUploadId(request: Request): string {
		const contentLength = request.headers['content-length'] ?? '';
		const timestamp = Date.now();

		return `${request.ip}-${contentLength}-${timestamp}`.replace(/[^a-zA-Z0-9-]/g, '');
	}

	private isLikelyBrowserRetry(request: Request): boolean {
		const userAgent = request.headers['user-agent'] ?? '';
		const isFirefox = userAgent.toLowerCase().includes('firefox');

		if (!isFirefox) {
			return false;
		}

		// Check for rapid successive requests with same content-length
		const contentLength = request.headers['content-length'];

		if (!contentLength) {
			return false;
		}

		// Look for similar uploads in the last 30 seconds
		const thirtySecondsAgo = Date.now() - 30000;

		for (const [uploadId, info] of this.activeUploads.entries()) {
			if (info.startTime > thirtySecondsAgo && uploadId.includes(contentLength)) {
				return true;
			}
		}

		return false;
	}
}
