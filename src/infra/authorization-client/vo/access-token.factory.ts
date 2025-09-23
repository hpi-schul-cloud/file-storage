import { AccessToken } from './access-token.vo';

export class AccessTokenFactory {
	public static build(props: AccessToken): AccessToken {
		return new AccessToken(props);
	}

	public static buildFromString(token: string): AccessToken {
		return new AccessToken({ token });
	}
}
