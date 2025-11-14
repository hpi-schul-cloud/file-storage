import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TypeGuard } from '@shared/guard';
import { Request, Response } from 'express';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { TimeoutInterceptorConfig } from './interfaces';

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

		// Create AbortController to signal timeout to the application
		const abortController = new AbortController();

		// Store the abort controller on the request so upload handlers can access it
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(request as any).timeoutAbortController = abortController;

		return next.handle().pipe(
			timeout(validTimeoutMS),
			catchError((err: Error) => {
				if (err instanceof TimeoutError) {
					// Signal timeout to all stream operations
					abortController.abort();

					// Set proper headers to prevent browser retry
					response.setHeader('Connection', 'close');
					response.setHeader('Cache-Control', 'no-store');

					// Give streams a moment to cleanup before throwing
					setTimeout(() => {
						// Mark request as no longer readable to prevent further processing
						if (request.readable) {
							request.destroy();
						}
					}, 10);

					return throwError(
						() => new RequestTimeoutException(`url: ${url} - Request timed out after ${validTimeoutMS}ms`)
					);
				}

				return throwError(() => err);
			})
		);
	}
}
