import { NotImplementedException } from '@nestjs/common';

import { plainToClass } from 'class-transformer';
import { SanitizeHtml } from './sanitize-html.transformer';

describe('SanitizeHtmlTransformer Decorator', () => {
	class WithHtmlDto {
		@SanitizeHtml()
		title!: string;

		@SanitizeHtml()
		optionalTitle?: string;
	}

	describe('when sanitizing plain text', () => {
		it('should remove all html', () => {
			const plainString = { title: '<b>html text</b>' };
			const instance = plainToClass(WithHtmlDto, plainString);

			expect(instance.title).toEqual('html text');
		});

		it('should not encode html entities', () => {
			const plainString = { title: 'X & Y < 5' };
			const instance = plainToClass(WithHtmlDto, plainString);

			expect(instance.title).toEqual('X & Y < 5');

			const plainString2 = { title: 'X & Y > 5' };
			const instance2 = plainToClass(WithHtmlDto, plainString2);

			expect(instance2.title).toEqual('X & Y > 5');
		});

		describe('when the text contains a "<" without the closing ">"', () => {
			it('should remove all characters after the "<"', () => {
				const plainString = { title: 'X<Y & A' };
				const instance = plainToClass(WithHtmlDto, plainString);

				expect(instance.title).toEqual('X');
			});
		});

		describe('when the text contains both a "<" and ">"', () => {
			it('should remove all characters between "<" and ">"', () => {
				const plainString = { title: 'X<Y & A>B' };
				const instance = plainToClass(WithHtmlDto, plainString);

				expect(instance.title).toEqual('XB');
			});
		});
	});

	it('should allow optional properties', () => {
		const instance = plainToClass(WithHtmlDto, { title: 'title' });

		expect(instance.optionalTitle).toBe(undefined);
	});

	it('should throw when the property is not a string', () => {
		expect(() => plainToClass(WithHtmlDto, { title: 42 })).toThrow(NotImplementedException);
	});
});
