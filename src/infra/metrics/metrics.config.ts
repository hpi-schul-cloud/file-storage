import { Configuration } from '@infra/configuration';
import { StringToBoolean } from '@shared/transformer';
import { IsBoolean } from 'class-validator';

@Configuration()
export class MetricConfig {
	@IsBoolean()
	@StringToBoolean()
	COLLECT_DEFAULT_METRICS = true;
}
