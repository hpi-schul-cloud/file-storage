/** **********************************************************
 * This is a module facade.                                  *
 * Export only what is allowed to be used externally.        *
 * Do not use wildcard exports.                              *
 * Do not export *.app.module.ts here; import them directly. *
 *********************************************************** */

export { AuthGuardModule, AuthGuardOptions } from './auth-guard.module';
export { CurrentUser, JWT, JwtAuthentication, XApiKeyAuthentication } from './decorator';
// JwtAuthGuard only exported because api tests still overried this guard.
// Use JwtAuthentication decorator for request validation
export { JwtAuthGuard, XApiKeyGuard } from './guard';
export { CreateJwtPayload, CurrentUserInterface as ICurrentUser, JwtPayload, StrategyType } from './interface';
export { CurrentUserBuilder, JwtPayloadFactory } from './mapper';
