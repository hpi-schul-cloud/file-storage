import { JwtFromRequestFunction, StrategyOptions } from 'passport-jwt';
import { AuthGuardConfig } from '../auth-guard.config';

export class JwtStrategyOptionsFactory {
	public static build(jwtFromRequestFunction: JwtFromRequestFunction, config: AuthGuardConfig): StrategyOptions {
		const publicKey = config.jwtPublicKey;
		const algorithm = config.jwtSigningAlgorithm;

		const options = {
			jwtFromRequest: jwtFromRequestFunction,
			secretOrKey: publicKey,
			ignoreExpiration: false,
			algorithms: [algorithm],
			issuer: config.jwtDomain,
			audience: config.jwtDomain,
		};

		return options;
	}
}
