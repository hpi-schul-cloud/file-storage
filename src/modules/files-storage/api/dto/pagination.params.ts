import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationParams {
	@IsInt()
	@Min(0)
	@IsOptional()
	@ApiPropertyOptional({ description: 'Number of elements (not pages) to be skipped' })
	skip?: number;

	@IsInt()
	@Min(1)
	@Max(100)
	@IsOptional()
	@ApiPropertyOptional({ description: 'Page limit, defaults to 10.', minimum: 1, maximum: 99 })
	limit?: number;
}
