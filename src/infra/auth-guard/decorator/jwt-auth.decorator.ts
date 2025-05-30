import {
	applyDecorators,
	createParamDecorator,
	ExecutionContext,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../guard';
import { isCurrentUser } from '../mapper';
import { JwtExtractor } from '../utils/jwt';

/**
 * Authentication Decorator taking care of require authentication header to be present, setting up the user context and extending openAPI spec.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export const JwtAuthentication = () => {
	const decorators = [
		// apply jwt authentication
		UseGuards(JwtAuthGuard),
		// add jwt authentication to openapi spec
		ApiBearerAuth(),
	];

	return applyDecorators(...decorators);
};

/**
 * Returns the current authenticated user.
 * @requires Authenticated
 */
export const CurrentUser = createParamDecorator((_, ctx: ExecutionContext) => {
	const expressRequest = ctx.switchToHttp().getRequest<Request>();
	const requestUser = expressRequest.user;

	if (!requestUser || !isCurrentUser(requestUser)) {
		throw new UnauthorizedException(
			'CurrentUser missing in request context. This route requires jwt authentication guard enabled.'
		);
	}

	return requestUser;
});

/**
 * Returns the current JWT.
 * @requires Authenticated
 */
export const JWT = createParamDecorator((_, ctx: ExecutionContext) => {
	const req: Request = ctx.switchToHttp().getRequest();
	const jwt = JwtExtractor.extractJwtFromRequest(req);

	if (!jwt) {
		throw new UnauthorizedException('Authentication is required.');
	}

	return jwt;
});
