import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Histogram, register } from 'prom-client';
import { MetricConfig } from './metrics.config';

@Injectable()
export class MetricsService implements OnModuleInit {
	constructor(private readonly config: MetricConfig) {}

	public onModuleInit(): void {
		if (this.config.COLLECT_DEFAULT_METRICS) {
			collectDefaultMetrics();
		}
		MetricsService.setupMetricsReset();
	}

	public static readonly currentUploadsGauge = new Gauge({
		name: 'file_storage_current_uploads',
		help: 'Number of current file uploads',
	});

	public static readonly totalUploadsGauge = new Gauge({
		name: 'file_storage_total_uploads_per_period',
		help: 'Total number of uploads in the current collection period',
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

	public static updateTotalUploads(): void {
		this.totalUploadsGauge.inc();
	}

	public static resetTotalUploads(): void {
		this.totalUploadsGauge.set(0);
	}

	private static setupMetricsReset(): void {
		// Override the getMetrics method to include reset logic
		const originalGetMetrics = register.metrics.bind(register);

		register.metrics = async (): Promise<string> => {
			const metrics = await originalGetMetrics();
			// Schedule reset after metrics are returned
			setImmediate(() => {
				MetricsService.resetTotalUploads();
			});

			return metrics;
		};
	}
}
