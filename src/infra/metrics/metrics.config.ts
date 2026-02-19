import { ConfigProperty, Configuration } from '@infra/configuration';
import { StringToBoolean } from '@shared/transformer';
import { IsBoolean } from 'class-validator';

export const METRIC_CONFIG_TOKEN = 'METRIC_CONFIG_TOKEN';

@Configuration()
export class MetricConfig {
	@IsBoolean()
	@StringToBoolean()
	@ConfigProperty('COLLECT_DEFAULT_METRICS')
	collectDefaultMetrics = true;
}
