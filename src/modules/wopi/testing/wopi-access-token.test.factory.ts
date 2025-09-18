import { randomUUID } from 'node:crypto';
import { WopiAccessToken, WopiAccessTokenFactory } from '../domain';

// TODO Hier haut irgendwas gar nicht hin!
class WopiAccessTokenTestFactory {
	private readonly props: WopiAccessToken = {
		token: randomUUID(),
	};

	public build(params: Partial<WopiAccessToken> = {}): WopiAccessToken {
		return WopiAccessTokenFactory.build({ ...this.props, ...params });
	}
}

export const wopiAccessTokenTestFactory = (): WopiAccessTokenTestFactory => new WopiAccessTokenTestFactory();
