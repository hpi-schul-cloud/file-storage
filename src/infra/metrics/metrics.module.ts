import { ConfigurationModule } from '@infra/configuration';
import { LoggerModule } from '@infra/logger';
import { Module } from '@nestjs/common';
import { MetricsController } from './api/metrics.controller';
import { METRIC_CONFIG_TOKEN, MetricConfig } from './metrics.config';
import { MetricsService } from './metrics.service';

@Module({
	imports: [LoggerModule, ConfigurationModule.register(METRIC_CONFIG_TOKEN, MetricConfig)],
	controllers: [MetricsController],
	providers: [MetricsService],
})
export class MetricsModule {}
