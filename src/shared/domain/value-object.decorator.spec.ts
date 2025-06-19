import { TestVO } from './mocks/test.vo';

describe('ValueObject Decorator', () => {
	describe('when creating a valid Value Object', () => {
		it('should create an instance without errors', () => {
			const props = { a: 1, b: 'test' };
			const vo = new TestVO(props);
			expect(vo).toBeInstanceOf(TestVO);
			expect(vo.integer).toBe(1);
			expect(vo.string).toBe('test');
		});
	});

	describe('when creating an invalid Value Object', () => {
		it('should throw validation errors', () => {
			const props = { a: 1, b: 123 };
			//@ts-expect-error
			expect(() => new TestVO(props)).toThrow('isString');
		});
	});

	describe('equals method', () => {
		it('should return true for equal Value Objects', () => {
			const vo1 = new TestVO({ a: 1, b: 'test' });
			const vo2 = new TestVO({ a: 1, b: 'test' });
			expect(vo1.equals(vo2)).toBe(true);
		});

		it('should return false for different Value Objects', () => {
			const vo1 = new TestVO({ a: 1, b: 'test' });
			const vo2 = new TestVO({ a: 2, b: 'test' });
			expect(vo1.equals(vo2)).toBe(false);
		});
	});

	describe('toString method', () => {
		it('should return JSON string representation of the Value Object', () => {
			const vo = new TestVO({ a: 1, b: 'test' });
			expect(vo.toString()).toBe(JSON.stringify(vo));
		});
	});

	describe('toJSON method', () => {
		it('should return JSON object representation of the Value Object', () => {
			const vo = new TestVO({ a: 1, b: 'test' });
			expect(vo.toJSON()).toEqual({ integer: 1, string: 'test' });
		});
	});
});
