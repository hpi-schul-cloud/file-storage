/** **********************************************************
 * This is a module facade.                                  *
 * Export only what is allowed to be used externally.        *
 * Do not use wildcard exports.                              *
 * Do not export *.app.module.ts here; import them directly. *
 *********************************************************** */

export {
	AuthorizationBodyParamsReferenceType,
	AuthorizationContextParams,
	AuthorizationContextParamsAction,
	AuthorizationContextParamsRequiredPermissions,
} from './authorization-api-client';
export { AuthorizationClientAdapter } from './authorization-client.adapter';
export { AuthorizationClientConfig, AuthorizationClientModule } from './authorization-client.module';
export { AuthorizationContextBuilder } from './mapper';
export { AccessToken, accessTokenRegex } from './vo';
