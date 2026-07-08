import { ICurrentUser } from '@infra/auth-guard';
import { Logger } from '@infra/logger';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RequestLoggingLoggable } from './loggable/request-logging.loggable';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
	constructor(private readonly logger: Logger) {}

	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		this.logger.setContext(`${context.getClass().name}::${context.getHandler().name}()`);

		const req: Request = context.switchToHttp().getRequest();
		const currentUser = req.user as ICurrentUser;
		const logging = new RequestLoggingLoggable(currentUser.userId, req);

		return next.handle().pipe(
			tap(() => {
				this.logger.info(logging);
			}),
			catchError((err: unknown) => {
				this.logger.info(logging);

				return throwError(() => err);
			})
		);
	}
}
