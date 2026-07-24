import { type AccessToken, AccessTokenFactory } from '../vo';
import { generateNanoId } from './nanoid.test.factory';

class AccessTokenTestFactory {
	private readonly props: AccessToken = {
		token: generateNanoId(),
	};

	public build(params: Partial<AccessToken> = {}): AccessToken {
		return AccessTokenFactory.build({ ...this.props, ...params });
	}
}

export const accessTokenTestFactory = (): AccessTokenTestFactory => new AccessTokenTestFactory();
