import { ParentStatistic } from './parent-statistic';

describe('ParentStatistic', () => {
	it('should create an instance with valid props', () => {
		const stat = new ParentStatistic({ fileCount: 5, totalSizeInBytes: 1000 });

		expect(stat.fileCount).toBe(5);
		expect(stat.totalSizeInBytes).toBe(1000);
	});

	it('should fail validation for non-positive fileCount', () => {
		expect(() => new ParentStatistic({ fileCount: -1, totalSizeInBytes: 1000 })).toThrow();
	});

	it('should fail validation for non-positive totalSizeInBytes', () => {
		expect(() => new ParentStatistic({ fileCount: 5, totalSizeInBytes: -100 })).toThrow();
	});
});
