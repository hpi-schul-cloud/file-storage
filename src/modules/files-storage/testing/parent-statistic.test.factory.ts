import { DeepPartial } from 'fishery';
import { ParentStatisticFactory } from '../domain';
import { ParentStatistic, ParentStatisticProps } from '../domain/ParentStatistic';

class ParentStatisticTestFactory {
	private sequence = Math.floor(Math.random() * 1000);

	props: ParentStatisticProps = {
		fileCount: this.sequence,
		totalSizeInBytes: this.sequence * 100,
	};

	public build(params: DeepPartial<ParentStatisticProps> = {}): ParentStatistic {
		const props = { ...this.props, ...params };

		const parentStatistic = ParentStatisticFactory.build(props);

		this.sequence += 1;

		return parentStatistic;
	}
}

export const parentStatisticTestFactory = (): ParentStatisticTestFactory => new ParentStatisticTestFactory();
