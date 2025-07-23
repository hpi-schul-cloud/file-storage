import { randomUUID } from 'node:crypto';
import { WopiAccessToken } from '../../domain/wopi-access-token.vo';

class WopiAccessTokenTestFactory {
	private props: WopiAccessToken = {
		token: randomUUID(),
	};

	public build(params: Partial<WopiAccessToken> = {}): WopiAccessToken {
		return { ...this.props, ...params };
	}
}

export const wopiAccessTokenTestFactory = (): WopiAccessTokenTestFactory => new WopiAccessTokenTestFactory();
