import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TypeGuard } from '@shared/guard';
import { Request, Response } from 'express';
import { IncomingMessage } from 'node:http';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { AbortableRequest, TimeoutInterceptorConfig } from './interfaces';

/**
 * This interceptor leaves the request execution after a given timeout in ms.
 * This will not stop the running services behind the controller.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
	private readonly defaultConfigKey: keyof TimeoutInterceptorConfig = 'CORE_INCOMING_REQUEST_TIMEOUT_MS';

	constructor(private readonly config: TimeoutInterceptorConfig) {}

	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const reflector = new Reflector();
		const requestTimeoutEnvironmentName =
			reflector.get<string>('requestTimeoutEnvironmentName', context.getHandler()) ??
			reflector.get<string>('requestTimeoutEnvironmentName', context.getClass());

		// type of requestTimeoutEnvironmentName is always invalid and can be different
		const timeoutMS = this.config[requestTimeoutEnvironmentName] ?? this.config[this.defaultConfigKey];
		const validTimeoutMS = TypeGuard.checkNumber(timeoutMS);

		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();
		const { url } = request;

		if (request instanceof IncomingMessage) {
			Object.defineProperties(request, {
				abortController: {
					value: new AbortController(),
				},
			});
		}

		return next.handle().pipe(
			timeout(validTimeoutMS),
			catchError((err: Error) => {
				if (err instanceof TimeoutError) {
					// Set headers to prevent browser retry and caching
					this.setAntiRetryHeaders(response);
					this.handleError(request);

					return throwError(() => new RequestTimeoutException(`url: ${url} - Request timed out after ${timeoutMS}ms`));
				}

				return throwError(() => err);
			})
		);
	}

	private handleError(request: AbortableRequest): void {
		// Signal timeout to all stream operations
		request.abortController?.abort();

		// Give streams a moment to cleanup before throwing
		setTimeout(() => {
			// Mark request as no longer readable to prevent further processing
			if (request.readable) {
				request.destroy();
			}
		}, 10);
	}

	private setAntiRetryHeaders(response: Response): void {
		response.setHeader('Connection', 'close');
		response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
		response.setHeader('Pragma', 'no-cache');
		response.setHeader('Expires', '0');
		response.setHeader('Surrogate-Control', 'no-store');
	}
}
