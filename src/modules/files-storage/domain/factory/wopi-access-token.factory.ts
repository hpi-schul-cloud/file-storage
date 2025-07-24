import { WopiAccessToken } from '../wopi-access-token.vo';

export class WopiAccessTokenFactory {
	public static build(props: WopiAccessToken): WopiAccessToken {
		return new WopiAccessToken(props);
	}

	public static buildFromString(token: string): WopiAccessToken {
		return new WopiAccessToken({ token });
	}
}
