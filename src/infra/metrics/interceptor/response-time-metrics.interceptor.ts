import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { RequestResponseMetricLabelFactory } from '../factory';
import { MetricsService } from '../metrics.service';

@Injectable()
export class ResponseTimeMetricsInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const time = Date.now();
		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();
		const label = RequestResponseMetricLabelFactory.create(request, response);
		const timeInSeconds = time / 1000;

		MetricsService.responseTimeMetricHistogram.observe(label, timeInSeconds);

		return next.handle();
	}
}
