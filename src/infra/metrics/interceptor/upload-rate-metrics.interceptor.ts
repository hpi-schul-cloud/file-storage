import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../metrics.service';
import { InterceptorUtils } from './interceptor.utils';

@Injectable()
export class UploadRateMetricsInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const startTime = InterceptorUtils.getCurrentTime();
		const request = InterceptorUtils.getRequest(context);
		const uploadSize = InterceptorUtils.extractContentLength(request);

		return next.handle().pipe(
			tap(() => {
				this.recordMetrics(uploadSize, startTime);
			})
		);
	}

	private recordMetrics(bytesTransferred: number, startTime: number): void {
		const durationSeconds = InterceptorUtils.calculateDurationInSeconds(startTime);

		MetricsService.uploadSizeHistogram.observe(bytesTransferred);

		if (InterceptorUtils.isValidTransfer(bytesTransferred, durationSeconds)) {
			const rateMbPerSec = InterceptorUtils.calculateRateInMbPerSec(bytesTransferred, durationSeconds);
			MetricsService.uploadRateHistogram.observe(rateMbPerSec);
		}
	}
}
