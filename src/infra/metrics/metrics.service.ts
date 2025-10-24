import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Histogram, register } from 'prom-client';
import { MetricConfig } from './metrics.config';

@Injectable()
export class MetricsService implements OnModuleInit {
	constructor(private config: MetricConfig) {}

	public onModuleInit(): void {
		if (this.config.METRICS_COLLECT_DEFAULT) {
			collectDefaultMetrics();
		}
	}

	public static readonly currentUploadsGauge = new Gauge({
		name: 'file_storage_current_uploads',
		help: 'Number of current file uploads',
	});

	public static readonly currentDownloadsGauge = new Gauge({
		name: 'file_storage_current_downloads',
		help: 'Number of current file downloads',
	});

	public static readonly uploadDurationHistogram = new Histogram({
		name: 'file_storage_upload_duration_seconds',
		help: 'Duration of file uploads in seconds',
		buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
	});

	public static readonly downloadDurationHistogram = new Histogram({
		name: 'file_storage_download_duration_seconds',
		help: 'Duration of file downloads in seconds',
		buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
	});

	public static readonly uploadRateHistogram = new Histogram({
		name: 'file_storage_upload_rate_mb_per_sec',
		help: 'Upload rate in MB/s',
		buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 50],
	});

	public static readonly downloadRateHistogram = new Histogram({
		name: 'file_storage_download_rate_mb_per_sec',
		help: 'Download rate in MB/s',
		buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 50],
	});

	public static readonly uploadSizeHistogram = new Histogram({
		name: 'file_storage_upload_size_bytes',
		help: 'Upload size in bytes',
		buckets: [100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000],
	});

	public static readonly downloadSizeHistogram = new Histogram({
		name: 'file_storage_download_size_bytes',
		help: 'Download size in bytes',
		buckets: [100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000],
	});

	public static readonly responseTimeMetricHistogram = new Histogram({
		name: 'sc_api_response_time_in_seconds',
		help: 'SC API response time in seconds',
		labelNames: ['method', 'base_url', 'full_path', 'route_path', 'status_code'],
	});

	public async getMetrics(): Promise<string> {
		const metrics = await register.metrics();

		return metrics;
	}
}
