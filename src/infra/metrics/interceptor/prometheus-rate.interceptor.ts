import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../metrics.service';

@Injectable()
export class UploadRateInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const start = Date.now();

		return next.handle().pipe(
			tap((result) => {
				const bytesTransferred = result?.size ?? 0;
				const durationSeconds = (Date.now() - start) / 1000;
				if (bytesTransferred > 0 && durationSeconds > 0) {
					const rateMbPerSec = bytesTransferred / 1024 / 1024 / durationSeconds;
					MetricsService.uploadRateHistogram.observe(rateMbPerSec);
				}
			})
		);
	}
}
