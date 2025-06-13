import { IsInt, IsNumber, Min, validateSync } from 'class-validator';

export interface ParentStatisticProps {
	fileCount: number;
	totalSizeInBytes: number;
}

export class ParentStatistic {
	@IsInt()
	@Min(0)
	public readonly fileCount: number;
	@IsNumber()
	@Min(0)
	public readonly totalSizeInBytes: number;

	constructor(props: ParentStatisticProps) {
		const { fileCount, totalSizeInBytes } = props;

		this.fileCount = fileCount;
		this.totalSizeInBytes = totalSizeInBytes;

		// Should be replaced by value object decorator for the class in the future
		const errors = validateSync(this, { skipMissingProperties: false });

		if (errors.length > 0) {
			throw new Error(errors.toString());
		}
	}
}
