import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { JwtValidationAdapter } from '../adapter';
import { AuthGuardConfig } from '../auth-guard.config';
import { CurrentUserInterface, JwtPayload } from '../interface';
import { CurrentUserBuilder, JwtStrategyOptionsFactory } from '../mapper';
import { JwtExtractor } from '../utils/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly jwtValidationAdapter: JwtValidationAdapter,
		config: AuthGuardConfig
	) {
		const strategyOptions = JwtStrategyOptionsFactory.build(
			JwtExtractor.extractJwtFromRequest,
			config
		) as StrategyOptionsWithoutRequest;

		super(strategyOptions);
	}

	public async validate(payload: JwtPayload): Promise<CurrentUserInterface> {
		const { accountId, jti } = payload;
		try {
			await this.jwtValidationAdapter.isWhitelisted(accountId, jti);
			const currentUser = new CurrentUserBuilder(payload)
				.asExternalUser(payload.isExternalUser)
				.withExternalSystem(payload.systemId)
				.asUserSupporter(payload.support)
				.build();

			return currentUser;
		} catch (err) {
			throw new UnauthorizedException('Unauthorized.', { cause: err as Error });
		}
	}
}
