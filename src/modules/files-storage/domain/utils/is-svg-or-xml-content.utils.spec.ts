import { Readable } from 'node:stream';
import { isSvgOrXmlContent, readStreamPrefix } from './is-svg-or-xml-content.utils';

const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
	'base64'
);
const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const webp = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');
const jpeg = Buffer.from(
	'/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABQb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwB/AB//2Q==',
	'base64'
);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe('isSvgOrXmlContent', () => {
	it.each([
		['svg element', svg],
		['uppercase svg element', Buffer.from('<SVG xmlns="http://www.w3.org/2000/svg"/>')],
		['namespaced svg element', Buffer.from('<svg:svg xmlns:svg="http://www.w3.org/2000/svg"/>')],
		['xml declaration', Buffer.from('<?xml version="1.0"?>' + svg.toString())],
		[
			'svg doctype',
			Buffer.from('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'),
		],
		['leading whitespace', Buffer.from('\n\t  ' + svg.toString())],
		['utf-8 bom', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), svg])],
		['leading comment', Buffer.from('<!-- preview -->\n' + svg.toString())],
	])('detects %s', (_label, bytes) => {
		expect(isSvgOrXmlContent(bytes)).toBe(true);
	});

	it('detects utf-16 svg content', () => {
		expect(isSvgOrXmlContent(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(svg.toString(), 'utf16le')]))).toBe(
			true
		);
		expect(
			isSvgOrXmlContent(Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(svg.toString(), 'utf16le').swap16()]))
		).toBe(true);
	});

	it.each([
		['png', png],
		['jpeg', jpeg],
		['gif', gif],
		['webp', webp],
		['empty', Buffer.alloc(0)],
		['plain text', Buffer.from('not an image')],
		['unclosed comment', Buffer.from('<!-- still a comment')],
		['svg later in text', Buffer.from('hello <svg></svg>')],
		['png polyglot', Buffer.concat([png, svg])],
	])('ignores %s', (_label, bytes) => {
		expect(isSvgOrXmlContent(bytes)).toBe(false);
	});
});

describe('readStreamPrefix', () => {
	it('returns only the requested prefix and closes the stream', async () => {
		const stream = Readable.from([Buffer.from('abcdefghij')]);

		const prefix = await readStreamPrefix(stream, 4);

		expect(prefix).toEqual(Buffer.from('abcd'));
		expect(stream.destroyed).toBe(true);
	});

	it('reads several chunks and closes the stream when it ends', async () => {
		const stream = Readable.from([Buffer.from('ab'), Buffer.from('cd')]);

		const prefix = await readStreamPrefix(stream, 8);

		expect(prefix).toEqual(Buffer.from('abcd'));
		expect(stream.destroyed).toBe(true);
	});

	it('rejects an unexpected chunk and closes the stream', async () => {
		const stream = Readable.from(['text']);

		await expect(readStreamPrefix(stream, 8)).rejects.toThrow('Unexpected file stream chunk');
		expect(stream.destroyed).toBe(true);
	});
});
