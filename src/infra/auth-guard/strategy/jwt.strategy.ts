import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { AUTH_GUARD_CONFIG_TOKEN, AuthGuardConfig } from '../auth-guard.config';
import { CurrentUserInterface, JwtPayload } from '../interface';
import { CurrentUserBuilder, JwtStrategyOptionsFactory } from '../mapper';
import { JwtExtractor } from '../utils/jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(@Inject(AUTH_GUARD_CONFIG_TOKEN) private readonly config: AuthGuardConfig) {
		const strategyOptions = JwtStrategyOptionsFactory.build(
			JwtExtractor.extractJwtFromRequest,
			config
		) as StrategyOptionsWithoutRequest;

		super(strategyOptions);
	}

	public validate(payload: JwtPayload): CurrentUserInterface {
		try {
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
