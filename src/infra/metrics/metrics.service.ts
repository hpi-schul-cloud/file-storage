import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Histogram, register } from 'prom-client';
import { MetricConfig } from './metrics.config';

@Injectable()
export class MetricsService implements OnModuleInit {
	constructor(private readonly config: MetricConfig) {}

	private static maxConcurrentUploads = 0;

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

	public static readonly maxConcurrentUploadsGauge = new Gauge({
		name: 'file_storage_max_concurrent_uploads',
		help: 'Maximum number of concurrent uploads in the current collection period',
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

	public static async updateMaxConcurrentUploads(): Promise<void> {
		const currentMetric = await this.currentUploadsGauge.get();
		let currentValue = 0;

		// Handle the metric object structure
		if (currentMetric?.values?.length > 0) {
			currentValue = currentMetric.values[0].value as number;
		}

		if (currentValue > this.maxConcurrentUploads) {
			this.maxConcurrentUploads = currentValue;
			this.maxConcurrentUploadsGauge.set(this.maxConcurrentUploads);
		}
	}

	public static resetTotalUploads(): void {
		this.totalUploadsGauge.set(0);
	}

	public static resetMaxConcurrentUploads(): void {
		this.maxConcurrentUploads = 0;
		this.maxConcurrentUploadsGauge.set(0);
	}

	private static setupMetricsReset(): void {
		// Override the getMetrics method to include reset logic
		const originalGetMetrics = register.metrics.bind(register);

		register.metrics = async (): Promise<string> => {
			const metrics = await originalGetMetrics();
			// Schedule reset after metrics are returned
			setImmediate(() => {
				MetricsService.resetTotalUploads();
				MetricsService.resetMaxConcurrentUploads();
			});

			return metrics;
		};
	}
}
