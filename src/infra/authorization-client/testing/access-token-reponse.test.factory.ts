import { generateNanoId } from '@testing/factory/nanoid.factory';
import type { AccessTokenResponse } from '../authorization-api-client/models/access-token-response';

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
