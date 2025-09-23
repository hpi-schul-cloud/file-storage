import { generateNanoId } from '@testing/factory/nanoid.factory';
import { AccessToken, AccessTokenFactory } from '../vo';

class AccessTokenTestFactory {
	private readonly props: AccessToken = {
		token: generateNanoId(),
	};

	public build(params: Partial<AccessToken> = {}): AccessToken {
		return AccessTokenFactory.build({ ...this.props, ...params });
	}
}

export const accessTokenTestFactory = (): AccessTokenTestFactory => new AccessTokenTestFactory();
