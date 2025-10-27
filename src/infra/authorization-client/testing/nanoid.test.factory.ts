import { pseudoRandomBytes } from 'node:crypto';

export const generateNanoId = (length = 24): string => {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
	const bytes = pseudoRandomBytes(length);

	return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
};
