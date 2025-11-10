import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from '../metrics.service';

@Injectable()
export class CurrentUploadMetricsInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		MetricsService.incrementCurrentUploads();

		return next.handle().pipe(
			finalize(() => {
				MetricsService.decrementCurrentUploads();
			})
		);
	}
}
