import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from '../metrics.service';

@Injectable()
export class CurrentDownloadMetricsInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		MetricsService.currentDownloadsGauge.inc();
		const downloadDurationTimer = MetricsService.downloadDurationHistogram.startTimer();

		return next.handle().pipe(
			finalize(() => {
				MetricsService.currentDownloadsGauge.dec();
				downloadDurationTimer();
			})
		);
	}
}
