import { CopyFileResult } from '../../domain';
import { CopyFileResponse } from '../dto';

export class CopyFileResponseBuilder {
	public static build(copyFileResult: CopyFileResult): CopyFileResponse {
		const copyFileResponse = new CopyFileResponse({
			id: copyFileResult.id,
			sourceId: copyFileResult.sourceId,
			name: copyFileResult.name,
		});

		return copyFileResponse;
	}

	public static buildMany(copyFileResults: CopyFileResult[]): CopyFileResponse[] {
		const copyFileResponses = copyFileResults.map((copyFileResult) => this.build(copyFileResult));

		return copyFileResponses;
	}
}
