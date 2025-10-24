import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { ResponseTimeMetricLabelFactory } from '../factory';
import { MetricsService } from '../metrics.service';

@Injectable()
export class ResponseTimeMetricsInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const time = Date.now();
		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();
		const labels = ResponseTimeMetricLabelFactory.create(request, response);

		MetricsService.responseTimeMetricHistogram.observe(labels, time / 1000);

		return next.handle().pipe();
	}
}
