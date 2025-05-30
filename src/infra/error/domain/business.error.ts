import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorResponse } from '../dto';

export interface ErrorType {
	readonly type: string;
	readonly title: string;
	readonly message: string;
}

/**
 * Abstract base class for business errors, errors that are handled
 * within a client or inside the application.
 */
export abstract class BusinessError extends HttpException {
	@ApiProperty({ description: 'The response status code.' })
	public readonly code: number;

	@ApiProperty({ description: 'The error type.' })
	public readonly type: string;

	@ApiProperty({ description: 'The error title.' })
	public readonly title: string;

	@ApiProperty({ description: 'The error message.' })
	public readonly message: string;

	@ApiPropertyOptional({ description: 'The error details.' })
	// Is not matched by type validation because HttpException is already declared
	public readonly details?: Record<string, unknown>;

	protected constructor(
		{ type, title, message }: ErrorType,
		code: HttpStatus = HttpStatus.CONFLICT,
		details?: Record<string, unknown>,
		cause?: unknown
	) {
		super({ code, type, title, message: message }, code);
		this.code = code;
		this.type = type;
		this.title = title;
		this.message = message;
		this.details = details;

		if (cause instanceof Error) {
			this.cause = cause;
		} else if (cause !== undefined) {
			this.cause = typeof cause === 'object' ? new Error(JSON.stringify(cause)) : new Error(String(cause));
		} else {
			// cause remains undefined
		}
	}

	public override getResponse(): ErrorResponse {
		const errorResponse: ErrorResponse = new ErrorResponse(
			this.type,
			this.title,
			this.message,
			this.code,
			this.details
		);

		return errorResponse;
	}
}
