import { ParentStatistic, ParentStatisticProps } from './vo';

export class ParentStatisticFactory {
	public static build(props: ParentStatisticProps): ParentStatistic {
		const parentStatistic = new ParentStatistic(props);

		return parentStatistic;
	}
}
