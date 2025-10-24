import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../metrics.service';

@Injectable()
export class DownloadRateMetricsInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<StreamableFile> {
		const start = Date.now();

		return next.handle().pipe(
			tap((data) => {
				if (data && typeof data.getStream === 'function') {
					let totalBytes = 0;
					const stream = data.getStream();
					stream.on('data', (chunk: Buffer | string) => {
						totalBytes += Buffer.byteLength(chunk);
					});
					stream.on('end', () => {
						const durationSeconds = (Date.now() - start) / 1000;

						MetricsService.downloadSizeHistogram.observe(totalBytes);
						if (totalBytes > 0 && durationSeconds > 0) {
							const rateMbPerSec = totalBytes / 1024 / 1024 / durationSeconds;
							MetricsService.downloadRateHistogram.observe(rateMbPerSec);
						}
					});
				}
			})
		);
	}
}
