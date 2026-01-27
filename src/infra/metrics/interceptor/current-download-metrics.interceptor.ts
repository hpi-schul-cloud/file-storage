import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { MetricsService } from '../metrics.service';

@Injectable()
export class CurrentDownloadMetricsInterceptor implements NestInterceptor {

	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const response = context.switchToHttp().getResponse<Response>();

		MetricsService.incrementCurrentDownloads();

		// Hook into when the response actually closes (client disconnects or download completes)
		response.once('close', () => {
			MetricsService.decrementCurrentDownloads();
		});

		return next.handle();
	}
}
