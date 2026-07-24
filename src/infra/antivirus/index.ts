/** **********************************************************
 * This is a module facade.                                  *
 * Export only what is allowed to be used externally.        *
 * Do not use wildcard exports.                              *
 * Do not export *.app.module.ts here; import them directly. *
 *********************************************************** */

export { AntivirusModule } from './antivirus.module';
export { AntivirusService } from './antivirus.service';
export { AntivirusModuleOptions, AntivirusServiceOptions, ScanResult } from './interfaces/antivirus';
