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

	describe('toString method', () => {
		it('should return JSON string representation of the Value Object', () => {
			const vo = new TestVO({ a: 1, b: 'test' });
			expect(vo.toString()).toBe(JSON.stringify(vo));
		});
	});
});
