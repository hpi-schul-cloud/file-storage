import { ParentStatistic } from './parent-statistic';

describe('ParentStatistic', () => {
	it('should create an instance with positive values', () => {
		const stat = new ParentStatistic({ fileCount: 5, totalSizeInBytes: 1000 });

		expect(stat.fileCount).toBe(5);
		expect(stat.totalSizeInBytes).toBe(1000);
	});

	it('should create an instance with zero values', () => {
		const stat = new ParentStatistic({ fileCount: 0, totalSizeInBytes: 0 });

		expect(stat.fileCount).toBe(0);
		expect(stat.totalSizeInBytes).toBe(0);
	});

	it('should fail validation for non-integer fileCount', () => {
		expect(() => new ParentStatistic({ fileCount: 5.5, totalSizeInBytes: 1000 })).toThrow();
	});

	it('should fail validation for non-positive fileCount', () => {
		expect(() => new ParentStatistic({ fileCount: -1, totalSizeInBytes: 1000 })).toThrow();
	});

	it('should fail validation for non-positive totalSizeInBytes', () => {
		expect(() => new ParentStatistic({ fileCount: 5, totalSizeInBytes: -100 })).toThrow();
	});
});
