/** **********************************************************
 * This is a module facade.                                  *
 * Export only what is allowed to be used externally.        *
 * Do not use wildcard exports.                              *
 * Do not export *.app.module.ts here; import them directly. *
 *********************************************************** */

export { CurrentDownloadMetricsInterceptor } from './interceptor/current-download-metrics.interceptor';
export { CurrentUploadMetricsInterceptor } from './interceptor/current-upload-metrics.interceptor';
export { ResponseTimeMetricsInterceptor } from './interceptor/response-time-metrics.interceptor';
export { MetricsModule } from './metrics.module';
export { MetricsService } from './metrics.service';
