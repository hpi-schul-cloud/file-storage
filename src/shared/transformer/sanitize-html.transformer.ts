import { NotImplementedException } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import { decode } from 'html-entities';
import sanitize from 'sanitize-html';

/**
 * Decorator to sanitize a string by removing unwanted HTML.
 * Place after IsString decorator.
 * By default, it will return a plain text
 * @returns
 */
export function SanitizeHtml(): PropertyDecorator {
	return Transform((params: TransformFnParams) => {
		const value = params.obj[params.key];

		if (typeof value !== 'string') {
			throw new NotImplementedException('can only sanitize strings');
		}

		const textFilter = (text: string): string => decode(text);
		const options = { allowedTags: [], allowedAttributes: {}, textFilter };
		const sanitized = sanitize(value, options);

		return sanitized;
	});
}
