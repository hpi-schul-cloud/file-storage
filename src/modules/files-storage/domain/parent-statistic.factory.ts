import { ParentStatistic, ParentStatisticProps } from './parent-statistic';

export class ParentStatisticFactory {
	public static build(props: ParentStatisticProps): ParentStatistic {
		const parentStatistic = new ParentStatistic(props);

		return parentStatistic;
	}
}
