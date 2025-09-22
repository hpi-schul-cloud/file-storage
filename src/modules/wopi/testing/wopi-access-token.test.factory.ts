import { pseudoRandomBytes } from 'node:crypto';
import { WopiAccessToken, WopiAccessTokenFactory } from '../domain';

const generateNanoId = (length = 24): string => {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
	const bytes = pseudoRandomBytes(length);
	let result = '';

	for (let i = 0; i < length; i++) {
		result += chars[bytes[i] % chars.length];
	}

	return result;
};

class WopiAccessTokenTestFactory {
	private readonly props: WopiAccessToken = {
		token: generateNanoId(),
	};

	public build(params: Partial<WopiAccessToken> = {}): WopiAccessToken {
		return WopiAccessTokenFactory.build({ ...this.props, ...params });
	}
}

export const wopiAccessTokenTestFactory = (): WopiAccessTokenTestFactory => new WopiAccessTokenTestFactory();
