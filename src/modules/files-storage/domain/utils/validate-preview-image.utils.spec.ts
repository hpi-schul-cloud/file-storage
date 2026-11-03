import { UnprocessableEntityException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { FileDto, StorageType } from '../../domain';
import { validatePreviewImage } from './validate-preview-image.utils';

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
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');

describe('validatePreviewImage', () => {
	const createFile = (data: Buffer, mimeType = 'image/png', name = 'poc.png') =>
		new FileDto({ name, data: Readable.from(data), mimeType, storageType: StorageType.STANDARD });

	it.each([
		['image/png', png],
		['image/jpeg', jpeg],
		['image/gif', gif],
		['image/webp', webp],
	])('accepts actual %s content and preserves every byte', async (mimeType, bytes) => {
		const file = createFile(bytes, mimeType);

		const result = await validatePreviewImage(file);
		const chunks: Buffer[] = [];
		for await (const chunk of result.data) chunks.push(Buffer.from(chunk));

		expect(Buffer.concat(chunks)).toEqual(bytes);
		expect(result.mimeType).toBe(mimeType);
		expect(result.name).toBe(file.name);
	});

	it.each(['poc.png', 'poc.svg.png', 'poc', 'poc.svg'])('rejects SVG regardless of filename: %s', async (name) => {
		const file = createFile(svg, 'image/png', name);

		await expect(validatePreviewImage(file)).rejects.toBeInstanceOf(UnprocessableEntityException);
		expect(file.data.destroyed).toBe(true);
	});

	it.each([
		['XML', Buffer.from('<?xml version="1.0"?>' + svg.toString())],
		['empty content', Buffer.alloc(0)],
		['unknown content', Buffer.from('not an image')],
		['truncated PNG', png.subarray(0, 8)],
		['PDF', Buffer.from('%PDF-1.7\n')],
	])('rejects %s labelled as PNG', async (_label, data) => {
		await expect(validatePreviewImage(createFile(data))).rejects.toBeInstanceOf(UnprocessableEntityException);
	});

	it.each(['image/jpeg', 'image/svg+xml', 'application/octet-stream', ''])(
		'rejects PNG declared as %s',
		async (mimeType) => {
			await expect(validatePreviewImage(createFile(png, mimeType))).rejects.toBeInstanceOf(
				UnprocessableEntityException
			);
		}
	);

	it('normalizes MIME type case and parameters', async () => {
		const result = await validatePreviewImage(createFile(png, 'IMAGE/PNG; charset=binary'));

		expect(result.mimeType).toBe('image/png');
		result.data.destroy();
	});

	it('replays content split across small chunks', async () => {
		const file = createFile(png);
		file.data = Readable.from(Array.from(png, (byte) => Buffer.from([byte])));

		const result = await validatePreviewImage(file);
		const chunks: Buffer[] = [];
		for await (const chunk of result.data) chunks.push(Buffer.from(chunk));

		expect(Buffer.concat(chunks)).toEqual(png);
	});

	it('preserves data beyond the detection sample', async () => {
		const bytes = Buffer.concat([png, Buffer.alloc(128 * 1024)]);
		const file = createFile(bytes);
		file.data = Readable.from([bytes.subarray(0, 100), bytes.subarray(100)]);

		const result = await validatePreviewImage(file);
		const chunks: Buffer[] = [];
		for await (const chunk of result.data) chunks.push(Buffer.from(chunk));

		expect(Buffer.concat(chunks)).toEqual(bytes);
	});

	it('rejects stream failures instead of trusting the declared type', async () => {
		const error = new Error('Remote connection failed');
		const file = createFile(png);
		file.data = new Readable({
			read() {
				this.destroy(error);
			},
		});

		await expect(validatePreviewImage(file)).rejects.toMatchObject({
			message: 'MIME_TYPE_MISMATCH',
			cause: error,
		});
		expect(file.data.destroyed).toBe(true);
	});
});
