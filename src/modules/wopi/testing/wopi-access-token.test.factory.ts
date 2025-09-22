import { generateNanoId } from '@testing/factory/nanoid.factory';
import { WopiAccessToken, WopiAccessTokenFactory } from '../domain';

class WopiAccessTokenTestFactory {
	private readonly props: WopiAccessToken = {
		token: generateNanoId(),
	};

	public build(params: Partial<WopiAccessToken> = {}): WopiAccessToken {
		return WopiAccessTokenFactory.build({ ...this.props, ...params });
	}
}

export const wopiAccessTokenTestFactory = (): WopiAccessTokenTestFactory => new WopiAccessTokenTestFactory();
