import { ParentStatistic } from '../../domain';
import { ParentStatsiticResponse } from '../dto';

export class ParentStatisticMapper {
	public static toParentStatisticResponse(parentStatistic: ParentStatistic): ParentStatsiticResponse {
		const fileStatsResponse: ParentStatsiticResponse = {
			fileCount: parentStatistic.fileCount,
			totalSizeInBytes: parentStatistic.totalSizeInBytes,
		};

		return fileStatsResponse;
	}
}
