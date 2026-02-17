import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Gauge, Histogram, register } from 'prom-client';
import { METRIC_CONFIG_TOKEN, MetricConfig } from './metrics.config';

@Injectable()
export class MetricsService implements OnModuleInit {
	constructor(@Inject(METRIC_CONFIG_TOKEN) private readonly config: MetricConfig) {}

	private static maxConcurrentUploads = 0;
	private static currentUploadsCount = 0;
	private static maxConcurrentDownloads = 0;
	private static currentDownloadsCount = 0;

	public onModuleInit(): void {
		if (this.config.collectDefaultMetrics) {
			collectDefaultMetrics();
		}
	}

	private static readonly maxConcurrentUploadsGauge = new Gauge({
		name: 'file_storage_max_concurrent_uploads',
		help: 'Maximum number of concurrent uploads ever recorded (all-time)',
	});

	private static readonly maxConcurrentDownloadsGauge = new Gauge({
		name: 'file_storage_max_concurrent_downloads',
		help: 'Maximum number of concurrent downloads ever recorded (all-time)',
	});

	private static readonly currentConcurrentUploadsGauge = new Gauge({
		name: 'file_storage_current_concurrent_uploads',
		help: 'Current number of active uploads',
	});

	private static readonly currentConcurrentDownloadsGauge = new Gauge({
		name: 'file_storage_current_concurrent_downloads',
		help: 'Current number of active downloads',
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

	public static incrementCurrentUploads(): void {
		this.currentUploadsCount++;
		this.currentConcurrentUploadsGauge.set(this.currentUploadsCount);
		this.updateMaxConcurrentUploads();
	}

	public static decrementCurrentUploads(): void {
		this.currentUploadsCount--;
		this.currentConcurrentUploadsGauge.set(this.currentUploadsCount);
	}

	public static updateMaxConcurrentUploads(): void {
		if (this.currentUploadsCount > this.maxConcurrentUploads) {
			this.maxConcurrentUploads = this.currentUploadsCount;
			this.maxConcurrentUploadsGauge.set(this.maxConcurrentUploads);
		}
	}

	public static incrementCurrentDownloads(): void {
		this.currentDownloadsCount++;
		this.currentConcurrentDownloadsGauge.set(this.currentDownloadsCount);
		this.updateMaxConcurrentDownloads();
	}

	public static decrementCurrentDownloads(): void {
		this.currentDownloadsCount--;
		this.currentConcurrentDownloadsGauge.set(this.currentDownloadsCount);
	}

	public static updateMaxConcurrentDownloads(): void {
		if (this.currentDownloadsCount > this.maxConcurrentDownloads) {
			this.maxConcurrentDownloads = this.currentDownloadsCount;
			this.maxConcurrentDownloadsGauge.set(this.maxConcurrentDownloads);
		}
	}
}
