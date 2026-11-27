import { JwtExtractor } from '@infra/auth-guard/utils/jwt';
import { ForbiddenException } from '@nestjs/common';
import { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { ExtractJwt } from 'passport-jwt';

const JWT_COOKIE_NAME = 'jwt';
const jwtFromCookie = JwtExtractor.fromCookie(JWT_COOKIE_NAME);
const jwtFromBearer = ExtractJwt.fromAuthHeaderAsBearerToken();

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * GETs that create or persist state. SameSite=Lax still sends the jwt cookie on a
 * cross-site top-level navigation, so these cannot be treated as ordinary reads.
 * Express dispatches HEAD to the GET handler, and route matching is case-insensitive,
 * so HEAD and any capitalization of this path are checked the same way.
 *
 * GET /wopi/authorized-collabora-document-url is @JwtAuthentication() and creates an access token.
 */
const PROTECTED_GET_PATH = /^\/(?:api\/v3\/)?wopi\/authorized-collabora-document-url$/i;

const SAME_ORIGIN_FETCH_SITES = new Set(['same-origin', 'none']);

export const COOKIE_CREDENTIAL_CSRF_MESSAGE = 'Cross-site cookie-credentialed request is forbidden';

/**
 * Rejects cookie-credentialed state-changing requests that are not same-origin.
 * A request is cookie-credentialed when a jwt cookie is present and Authorization: Bearer is absent.
 *
 * The Origin/Referer fallback compares against the configured public origin instead of the request's
 * protocol and Host header, because TLS terminates at the ingress and forwarded headers are not trusted.
 */
export function createCookieCredentialCsrfMiddleware(publicOrigin: string): RequestHandler {
	const expectedOrigin = toPublicOrigin(publicOrigin);

	return (request: Request, _response: Response, next: NextFunction): void => {
		if (
			isCookieCredentialed(request) &&
			isStateChanging(request) &&
			!isTrustedBrowserRequest(request, expectedOrigin)
		) {
			throw new ForbiddenException(COOKIE_CREDENTIAL_CSRF_MESSAGE);
		}

		next();
	};
}

function toPublicOrigin(publicOrigin: string): string {
	const url = parseUrl(publicOrigin);

	if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
		throw new Error(`Invalid public origin for cookie CSRF protection: ${publicOrigin}`);
	}

	return url.origin;
}

function isCookieCredentialed(request: Request): boolean {
	const cookieJwt = jwtFromCookie(request);

	if (!cookieJwt) {
		return false;
	}

	return !jwtFromBearer(request);
}

function isStateChanging(request: Request): boolean {
	const method = request.method.toUpperCase();

	if (UNSAFE_METHODS.has(method)) {
		return true;
	}

	if (method !== 'GET' && method !== 'HEAD') {
		return false;
	}

	return PROTECTED_GET_PATH.test(normalizePath(request.path || '/'));
}

function isTrustedBrowserRequest(request: Request, expectedOrigin: string): boolean {
	const fetchSite = headerValue(request, 'sec-fetch-site')?.toLowerCase();

	if (fetchSite) {
		return SAME_ORIGIN_FETCH_SITES.has(fetchSite);
	}

	const origin = headerValue(request, 'origin');

	if (origin) {
		return hasExpectedOrigin(origin, expectedOrigin);
	}

	const referer = headerValue(request, 'referer') ?? headerValue(request, 'referrer');

	if (referer) {
		return hasExpectedOrigin(referer, expectedOrigin);
	}

	return false;
}

function hasExpectedOrigin(candidate: string, expectedOrigin: string): boolean {
	return parseUrl(candidate)?.origin === expectedOrigin;
}

function parseUrl(value: string): URL | undefined {
	try {
		return new URL(value);
	} catch {
		return undefined;
	}
}

function headerValue(request: Request, name: string): string | undefined {
	const value = request.get(name);

	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();

	return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePath(path: string): string {
	const withoutQuery = path.split('?')[0] ?? '/';
	const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;

	if (withLeadingSlash.length > 1) {
		return withLeadingSlash.replace(/\/+$/, '');
	}

	return withLeadingSlash;
}
