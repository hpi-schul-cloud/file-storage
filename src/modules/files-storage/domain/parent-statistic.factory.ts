import { ParentStatistic, ParentStatisticProps } from './ParentStatistic';

export class ParentStatisticFactory {
	public static build(props: ParentStatisticProps): ParentStatistic {
		const parentStatistic = new ParentStatistic(props);

		return parentStatistic;
	}
}
