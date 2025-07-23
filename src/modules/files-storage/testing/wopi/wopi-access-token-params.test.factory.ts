import { randomUUID } from 'node:crypto';
import { WopiAccessTokenParams } from '../../api/dto';

class WopiAccessTokenParamsTestFactory {
	private readonly props: WopiAccessTokenParams = {
		access_token: randomUUID(),
	};

	public build(params: Partial<WopiAccessTokenParams> = {}): WopiAccessTokenParams {
		return { ...this.props, ...params };
	}

	public withAccessToken(access_token: string): this {
		this.props.access_token = access_token;

		return this;
	}
}

export const wopiAccessTokenParamsTestFactory = (): WopiAccessTokenParamsTestFactory =>
	new WopiAccessTokenParamsTestFactory();
