import type { BatchOperationResult } from './interface';

export const BatchOperationResultFactory = {
	empty: (): BatchOperationResult => ({ succeeded: [], failed: [] }),

	merge: (a: BatchOperationResult, b: BatchOperationResult): BatchOperationResult => ({
		succeeded: [...a.succeeded, ...b.succeeded],
		failed: [...a.failed, ...b.failed],
	}),
};
