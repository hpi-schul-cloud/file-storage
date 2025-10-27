import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from '../metrics.service';

@Injectable()
export class CurrentUploadMetricsInterceptor implements NestInterceptor {
	public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
		MetricsService.currentUploadsGauge.inc();
		console.log("in " + new Date() + JSON.stringify(await MetricsService.currentUploadsGauge.get()))

		const uploadDurationTimer = MetricsService.uploadDurationHistogram.startTimer();

		return next.handle().pipe(
			finalize(async () => {
				console.log("out " + new Date() + JSON.stringify(await MetricsService.currentUploadsGauge.get()))
				MetricsService.currentUploadsGauge.dec();
				uploadDurationTimer();
			})
		);
	}
}
