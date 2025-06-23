import { ValueObject } from '@shared/domain/value-object.decorator';
import { IsInt, IsNumber, Min } from 'class-validator';

export interface ParentStatisticProps {
	fileCount: number;
	totalSizeInBytes: number;
}

@ValueObject()
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
	}
}
