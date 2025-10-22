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

	public async getMetrics(): Promise<string> {
		const metrics = await register.metrics();

		return metrics;
	}
}
