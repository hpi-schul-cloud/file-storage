import { InternalServerErrorException } from '@nestjs/common';

export interface ParentStatisticProps {
	fileCount: number;
	totalSizeInBytes: number;
}

export class ParentStatistic {
	public readonly fileCount: number;
	public readonly totalSizeInBytes: number;

	constructor(props: ParentStatisticProps) {
		const { fileCount, totalSizeInBytes } = props;

		if (fileCount < 0 || totalSizeInBytes < 0) {
			throw new InternalServerErrorException('File count or totalSize cannot be negative');
		}
		this.fileCount = fileCount;
		this.totalSizeInBytes = totalSizeInBytes;
	}
}
