import { IsNumber, IsPositive } from 'class-validator';

export interface ParentStatisticProps {
	fileCount: number;
	totalSizeInBytes: number;
}

export class ParentStatistic {
	@IsNumber()
	@IsPositive()
	public readonly fileCount: number;
	@IsNumber()
	@IsPositive()
	public readonly totalSizeInBytes: number;

	constructor(props: ParentStatisticProps) {
		const { fileCount, totalSizeInBytes } = props;

		this.fileCount = fileCount;
		this.totalSizeInBytes = totalSizeInBytes;
	}
}
