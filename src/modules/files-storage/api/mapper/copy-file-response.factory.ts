import { CopyFileResult } from '../../domain';
import { CopyFileResponse } from '../dto';

export class CopyFileResponseFactory {
	public static create(copyFileResult: CopyFileResult): CopyFileResponse {
		const copyFileResponse = new CopyFileResponse({
			id: copyFileResult.id,
			sourceId: copyFileResult.sourceId,
			name: copyFileResult.name,
		});

		return copyFileResponse;
	}

	public static createMany(copyFileResults: CopyFileResult[]): CopyFileResponse[] {
		const copyFileResponses = copyFileResults.map((copyFileResult) => this.create(copyFileResult));

		return copyFileResponses;
	}
}
