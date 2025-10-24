import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../metrics.service';

@Injectable()
export class UploadRateMetricsInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const start = Date.now();
		const request: Request = context.switchToHttp().getRequest();
		const size = request.headers['content-length'] ? parseInt(request.headers['content-length'], 10) : 0;

		return next.handle().pipe(
			tap(() => {
				const bytesTransferred = size;
				MetricsService.uploadSizeHistogram.observe(bytesTransferred);

				const durationSeconds = (Date.now() - start) / 1000;
				if (bytesTransferred > 0 && durationSeconds > 0) {
					const rateMbPerSec = bytesTransferred / 1024 / 1024 / durationSeconds;
					MetricsService.uploadRateHistogram.observe(rateMbPerSec);
				}
			})
		);
	}
}
