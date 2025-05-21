import { JwtFromRequestFunction, StrategyOptions } from 'passport-jwt';
import { AuthGuardConfig } from '../auth-guard.config';

export class JwtStrategyOptionsFactory {
	static build(jwtFromRequestFunction: JwtFromRequestFunction, config: AuthGuardConfig): StrategyOptions {
		const publicKey = config.JWT_PUBLIC_KEY;
		const algorithm = config.JWT_SIGNING_ALGORITHM;

		const options = {
			jwtFromRequest: jwtFromRequestFunction,
			secretOrKey: publicKey,
			ignoreExpiration: false,
			algorithms: [algorithm],
			issuer: config.JWT_DOMAIN,
			audience: config.JWT_DOMAIN,
		};

		return options;
	}
}
