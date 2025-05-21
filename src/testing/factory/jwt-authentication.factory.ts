import { CreateJwtPayload } from '@infra/auth-guard';
import jwt from 'jsonwebtoken';

const privateKey =
	'-----BEGIN RSA PRIVATE KEY-----\n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\n-----END RSA PRIVATE KEY-----\n';

const domain = 'localhost';

export class JwtAuthenticationFactory {
	public static createJwt(params: CreateJwtPayload): string {
		const validJwt = jwt.sign(
			{
				sub: params.accountId,
				iss: domain,
				aud: domain,
				jti: 'jti',
				iat: Date.now() / 1000,
				exp: (Date.now() + 1000000) / 1000,
				...params,
			},
			privateKey.replace(/\\n/g, '\n'),
			{
				algorithm: 'RS256',
			},
		);

		return validJwt;
	}
}
