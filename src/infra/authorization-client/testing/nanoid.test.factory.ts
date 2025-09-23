import { pseudoRandomBytes } from 'node:crypto';

export const generateNanoId = (length = 24): string => {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
	const bytes = pseudoRandomBytes(length);
	let result = '';

	for (let i = 0; i < length; i++) {
		result += chars[bytes[i] % chars.length];
	}

	return result;
};
