import { ICurrentUser } from '@infra/auth-guard';
import { Loggable, Logger, LogMessage } from '@infra/logger';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

class RequestLoggingLoggable implements Loggable {
	constructor(
		private readonly userId: string,
		private readonly request: Request,
	) {}

	getLogMessage(): LogMessage {
		return {
			message: RequestLoggingInterceptor.name,
			data: {
				userId: this.userId,
				url: this.request.url,
				method: this.request.method,
				params: JSON.stringify(this.request.params),
				query: JSON.stringify(this.request.query),
			},
		};
	}
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
	constructor(private logger: Logger) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
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
			}),
		);
	}
}
