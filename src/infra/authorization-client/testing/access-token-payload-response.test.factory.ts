import { ObjectId } from '@mikro-orm/mongodb';
import type { AccessTokenPayloadResponse } from '../authorization-api-client/models/access-token-payload-response';

class AccessTokenPayloadResponseTestFactory {
	private readonly props: AccessTokenPayloadResponse = {
		payload: { userId: new ObjectId().toHexString(), roles: [new ObjectId().toHexString()], exp: 9999999999 },
	};

	public build(params: Partial<AccessTokenPayloadResponse> = {}): AccessTokenPayloadResponse {
		return { ...this.props, ...params };
	}

	public withPayload(payload: object): this {
		this.props.payload = payload;

		return this;
	}
}

export const accessTokenPayloadResponseTestFactory = (): AccessTokenPayloadResponseTestFactory =>
	new AccessTokenPayloadResponseTestFactory();
