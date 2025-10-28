import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Histogram, register } from 'prom-client';
import { MetricConfig } from './metrics.config';

@Injectable()
export class MetricsService implements OnModuleInit {
	constructor(private readonly config: MetricConfig) {}

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
