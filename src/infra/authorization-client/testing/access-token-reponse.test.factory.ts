import type { AccessTokenResponse } from '../authorization-api-client/models/access-token-response';

class AccessTokenResponseTestFactory {
	private props: AccessTokenResponse = {
		token: 'test-token',
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
