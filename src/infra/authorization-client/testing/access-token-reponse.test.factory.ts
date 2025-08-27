import type { AccessTokenResponse } from '../authorization-api-client/models/access-token-response';

const generateNanoId = (length = 24): string => {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
	let result = '';
	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * chars.length);
		result += chars[randomIndex];
	}

	return result;
};

class AccessTokenResponseTestFactory {
	private readonly props: AccessTokenResponse = {
		token: generateNanoId(),
	};

	public build(params: Partial<AccessTokenResponse> = {}): AccessTokenResponse {
		return { ...this.props, ...params };
	}

	public withToken(token: string): this {
		this.props.token = token;

		return this;
	}
}

export const accessTokenResponseTestFactory = (): AccessTokenResponseTestFactory =>
	new AccessTokenResponseTestFactory();
