import { ParentStatistic } from '../../domain';
import { ParentStatisticResponse } from '../dto';

export class ParentStatisticMapper {
	public static toParentStatisticResponse(parentStatistic: ParentStatistic): ParentStatisticResponse {
		const fileStatsResponse: ParentStatisticResponse = {
			fileCount: parentStatistic.fileCount,
			totalSizeInBytes: parentStatistic.totalSizeInBytes,
		};

		return fileStatsResponse;
	}
}
