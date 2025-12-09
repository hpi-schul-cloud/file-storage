import { Readable } from 'node:stream';

export function pngReadable(): Readable {
	const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG file signature
	const readable = Readable.from(pngHeader);

	return readable;
}

export function textReadable(): Readable {
	const textContent = Buffer.from('Hello, this is plain text content for testing.', 'utf8');
	const readable = Readable.from(textContent);

	return readable;
}

export function aacReadable(): Readable {
	const aacHeader = Buffer.from([0xff, 0xf1, 0x50, 0x80, 0x00, 0x1f, 0xfc]); // AAC ADTS header
	const readable = Readable.from(aacHeader);

	return readable;
}

export function tiffReadable(): Readable {
	const tiffHeader = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]); // TIFF Big-Endian header (MM*)
	const readable = Readable.from(tiffHeader);

	return readable;
}

export function svgReadable(): Readable {
	const svgContent = Buffer.from(
		'<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',
		'utf8'
	);
	const readable = Readable.from(svgContent);

	return readable;
}

export function octetStreamReadable(): Readable {
	const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd, 0xfc]); // Random binary data
	const readable = Readable.from(binaryData);

	return readable;
}
