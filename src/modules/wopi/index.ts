/** **********************************************************
 * This is a module facade.                                  *
 * Export only what is allowed to be used externally.        *
 * Do not use wildcard exports.                              *
 * Do not export *.app.module.ts here; import them directly. *
 *********************************************************** */

export { WopiApiModule } from './wopi.api.module';
export { WOPI_PUBLIC_API_CONFIG_TOKEN, WopiPublicApiConfig } from './wopi.config';
