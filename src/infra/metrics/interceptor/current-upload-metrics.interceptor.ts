import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from '../metrics.service';

@Injectable()
export class CurrentUploadMetricsInterceptor implements NestInterceptor {
	public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
		MetricsService.currentUploadsGauge.inc();

		const uploadDurationTimer = MetricsService.uploadDurationHistogram.startTimer();

		return next.handle().pipe(
			finalize(async () => {
				MetricsService.currentUploadsGauge.dec();
				uploadDurationTimer();
			})
		);
	}
}
