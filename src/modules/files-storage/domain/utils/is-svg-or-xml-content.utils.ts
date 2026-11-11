import { type Readable } from 'node:stream';

export const SVG_XML_SNIFF_BYTE_COUNT = 8192;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const GIF_SIGNATURES = [Buffer.from('GIF87a'), Buffer.from('GIF89a')];
const WEBP_RIFF = Buffer.from('RIFF');
const WEBP_MARKER = Buffer.from('WEBP');

export function isSvgOrXmlContent(bytes: Buffer): boolean {
	if (bytes.length === 0 || hasRasterImageSignature(bytes)) {
		return false;
	}

	const head = stripLeadingMarkupNoise(decodeTextPrefix(bytes));

	return /^<\?xml\b/i.test(head) || /^<!doctype\s+svg\b/i.test(head) || /^<svg(?:$|[\s>/:])/i.test(head);
}

export async function readStreamPrefix(stream: Readable, maxBytes: number): Promise<Buffer> {
	const chunks: Buffer[] = [];
	let total = 0;

	try {
		for await (const chunk of stream) {
			const buf = asBuffer(chunk);
			const remaining = maxBytes - total;

			if (buf.length > remaining) {
				chunks.push(buf.subarray(0, remaining));
				break;
			}

			chunks.push(buf);
			total += buf.length;

			if (total >= maxBytes) {
				break;
			}
		}
	} finally {
		stream.destroy();
	}

	return Buffer.concat(chunks);
}

function hasRasterImageSignature(bytes: Buffer): boolean {
	if (bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
		return true;
	}

	if (bytes.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) {
		return true;
	}

	if (GIF_SIGNATURES.some((signature) => bytes.subarray(0, signature.length).equals(signature))) {
		return true;
	}

	return bytes.length >= 12 && bytes.subarray(0, 4).equals(WEBP_RIFF) && bytes.subarray(8, 12).equals(WEBP_MARKER);
}

function decodeTextPrefix(bytes: Buffer): string {
	if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
		return bytes.subarray(2).toString('utf16le');
	}

	if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
		return decodeUtf16Be(bytes.subarray(2));
	}

	if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
		return bytes.subarray(3).toString('utf8');
	}

	return bytes.toString('utf8');
}

function decodeUtf16Be(bytes: Buffer): string {
	const swapped = Buffer.alloc(bytes.length - (bytes.length % 2));

	for (let index = 0; index + 1 < bytes.length; index += 2) {
		swapped[index] = bytes[index + 1];
		swapped[index + 1] = bytes[index];
	}

	return swapped.toString('utf16le');
}

function stripLeadingMarkupNoise(value: string): string {
	let rest = value;

	for (;;) {
		const trimmed = rest.trimStart();

		if (!trimmed.startsWith('<!--')) {
			return trimmed;
		}

		const commentEnd = trimmed.indexOf('-->');

		if (commentEnd === -1) {
			return trimmed;
		}

		rest = trimmed.slice(commentEnd + 3);
	}
}

function asBuffer(chunk: unknown): Buffer {
	if (Buffer.isBuffer(chunk)) {
		return chunk;
	}

	if (chunk instanceof Uint8Array) {
		return Buffer.from(chunk);
	}

	throw new TypeError('Unexpected file stream chunk');
}
