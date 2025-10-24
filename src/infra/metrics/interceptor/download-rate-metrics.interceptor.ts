import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../metrics.service';
import { InterceptorUtils } from './interceptor.utils';

@Injectable()
export class DownloadRateMetricsInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<StreamableFile> {
		const startTime = InterceptorUtils.getCurrentTime();

		return next.handle().pipe(
			tap((response) => {
				if (InterceptorUtils.isStreamableResponse(response)) {
					this.measureStreamMetrics(response, startTime);
				}
			})
		);
	}

	private measureStreamMetrics(streamableFile: StreamableFile, startTime: number): void {
		let totalBytes = 0;
		const stream = streamableFile.getStream();

		stream.on('data', (chunk: Buffer | string) => {
			totalBytes += InterceptorUtils.getChunkSize(chunk);
		});

		stream.on('end', () => {
			this.recordMetrics(totalBytes, startTime);
		});
	}

	private recordMetrics(totalBytes: number, startTime: number): void {
		const durationSeconds = InterceptorUtils.calculateDurationInSeconds(startTime);

		MetricsService.downloadSizeHistogram.observe(totalBytes);

		if (InterceptorUtils.isValidTransfer(totalBytes, durationSeconds)) {
			const rateMbPerSec = InterceptorUtils.calculateRateInMbPerSec(totalBytes, durationSeconds);
			MetricsService.downloadRateHistogram.observe(rateMbPerSec);
		}
	}
}
