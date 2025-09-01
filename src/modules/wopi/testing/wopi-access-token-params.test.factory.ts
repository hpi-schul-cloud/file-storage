import { pseudoRandomBytes } from 'node:crypto';
import { WopiAccessTokenParams } from '../api/dto';

const generateNanoId = (length = 24): string => {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
	const bytes = pseudoRandomBytes(length);
	let result = '';

	for (let i = 0; i < length; i++) {
		result += chars[bytes[i] % chars.length];
	}

	return result;
};

class WopiAccessTokenParamsTestFactory {
	private readonly props: WopiAccessTokenParams = {
		access_token: generateNanoId(),
	};

	public build(params: Partial<WopiAccessTokenParams> = {}): WopiAccessTokenParams {
		return { ...this.props, ...params };
	}

	public withAccessToken(access_token: string): this {
		this.props.access_token = access_token;

		return this;
	}
}

export const wopiAccessTokenParamsTestFactory = (): WopiAccessTokenParamsTestFactory =>
	new WopiAccessTokenParamsTestFactory();
