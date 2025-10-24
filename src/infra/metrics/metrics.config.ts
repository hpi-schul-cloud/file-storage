import { Configuration } from '@infra/configuration';
import { StringToBoolean } from '@shared/transformer';
import { IsBoolean } from 'class-validator';

@Configuration()
export class MetricConfig {
	@IsBoolean()
	@StringToBoolean()
	METRICS_COLLECT_DEFAULT = true;
}
